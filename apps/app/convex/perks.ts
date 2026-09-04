import { v } from "convex/values";
import {
  adminMutation,
  adminQuery,
  onboardedMutation,
  onboardedQuery,
} from "./lib/customFunctions";
import { claimStatusValidator, perkTypeValidator } from "./lib/validators";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

function perkFields(perk: Doc<"perks">) {
  return {
    _id: perk._id,
    company: perk.company,
    title: perk.title,
    value: perk.value,
    description: perk.description,
    type: perk.type,
    active: perk.active,
  };
}

async function claimWithCode(
  ctx: QueryCtx,
  claim: Doc<"perkClaims">,
  perk: Doc<"perks">,
) {
  let code: string | undefined;
  if (claim.codeId) {
    const assigned = await ctx.db.get(claim.codeId);
    code = assigned?.code;
  }
  return {
    _id: claim._id,
    perkId: claim.perkId,
    title: perk.title,
    company: perk.company,
    type: claim.type,
    status: claim.status,
    code,
    createdAt: claim.createdAt,
  };
}

const perkReturn = v.object({
  _id: v.id("perks"),
  company: v.string(),
  title: v.string(),
  value: v.string(),
  description: v.string(),
  type: perkTypeValidator,
  active: v.boolean(),
  availableCodes: v.optional(v.number()),
});

const claimReturn = v.object({
  _id: v.id("perkClaims"),
  perkId: v.id("perks"),
  title: v.string(),
  company: v.string(),
  type: perkTypeValidator,
  status: claimStatusValidator,
  code: v.optional(v.string()),
  createdAt: v.number(),
});

export const listCatalog = onboardedQuery({
  args: {},
  returns: v.array(
    v.object({
      perk: perkReturn,
      claim: v.union(claimReturn, v.null()),
    }),
  ),
  handler: async (ctx) => {
    const perks = await ctx.db
      .query("perks")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const result = [];
    for (const perk of perks) {
      const claim = await ctx.db
        .query("perkClaims")
        .withIndex("by_perk_and_user", (q) =>
          q.eq("perkId", perk._id).eq("userId", ctx.user._id),
        )
        .unique();
      let availableCodes: number | undefined;
      if (perk.type === "code") {
        const unused = await ctx.db
          .query("perkCodes")
          .withIndex("by_perk_available", (q) =>
            q.eq("perkId", perk._id).eq("available", true),
          )
          .collect();
        availableCodes = unused.length;
      }
      result.push({
        perk: { ...perkFields(perk), availableCodes },
        claim: claim ? await claimWithCode(ctx, claim, perk) : null,
      });
    }
    return result;
  },
});

export const myClaims = onboardedQuery({
  args: {},
  returns: v.array(claimReturn),
  handler: async (ctx) => {
    const claims = await ctx.db
      .query("perkClaims")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
    const rows = [];
    for (const claim of claims) {
      const perk = await ctx.db.get(claim.perkId);
      if (!perk) continue;
      rows.push(await claimWithCode(ctx, claim, perk));
    }
    return rows;
  },
});

export const claim = onboardedMutation({
  args: { perkId: v.id("perks") },
  returns: v.id("perkClaims"),
  handler: async (ctx, args) => {
    const perk = await ctx.db.get(args.perkId);
    if (!perk || !perk.active) throw new Error("Perk not found");
    const existing = await ctx.db
      .query("perkClaims")
      .withIndex("by_perk_and_user", (q) =>
        q.eq("perkId", perk._id).eq("userId", ctx.user._id),
      )
      .unique();
    if (existing) throw new Error("You already claimed this perk");

    const now = Date.now();
    if (perk.type === "code") {
      const unused = await ctx.db
        .query("perkCodes")
        .withIndex("by_perk_available", (q) =>
          q.eq("perkId", perk._id).eq("available", true),
        )
        .first();
      if (!unused) throw new Error("No codes left for this perk");
      await ctx.db.patch(unused._id, {
        available: false,
        assignedTo: ctx.user._id,
        assignedAt: now,
      });
      return await ctx.db.insert("perkClaims", {
        perkId: perk._id,
        userId: ctx.user._id,
        type: "code",
        status: "assigned",
        codeId: unused._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    return await ctx.db.insert("perkClaims", {
      perkId: perk._id,
      userId: ctx.user._id,
      type: "email",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const adminList = adminQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("perks"),
      company: v.string(),
      title: v.string(),
      value: v.string(),
      description: v.string(),
      type: perkTypeValidator,
      active: v.boolean(),
      codeCount: v.number(),
      availableCodes: v.number(),
      claimCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const perks = await ctx.db.query("perks").collect();
    const rows = [];
    for (const perk of perks) {
      const codes = await ctx.db
        .query("perkCodes")
        .withIndex("by_perk", (q) => q.eq("perkId", perk._id))
        .collect();
      const claims = await ctx.db
        .query("perkClaims")
        .withIndex("by_perk", (q) => q.eq("perkId", perk._id))
        .collect();
      rows.push({
        ...perkFields(perk),
        codeCount: codes.length,
        availableCodes: codes.filter((code) => code.available).length,
        claimCount: claims.length,
      });
    }
    return rows;
  },
});

export const adminCreate = adminMutation({
  args: {
    company: v.string(),
    title: v.string(),
    value: v.string(),
    description: v.string(),
    type: perkTypeValidator,
    codes: v.optional(v.array(v.string())),
  },
  returns: v.id("perks"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const perkId = await ctx.db.insert("perks", {
      company: args.company.trim(),
      title: args.title.trim(),
      value: args.value.trim(),
      description: args.description.trim(),
      type: args.type,
      active: true,
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });
    if (args.type === "code") {
      const unique = new Set(
        (args.codes ?? [])
          .map((code) => code.trim())
          .filter((code) => code.length > 0),
      );
      for (const code of unique) {
        await ctx.db.insert("perkCodes", {
          perkId,
          code,
          available: true,
        });
      }
    }
    return perkId;
  },
});

export const adminUpdate = adminMutation({
  args: {
    perkId: v.id("perks"),
    company: v.optional(v.string()),
    title: v.optional(v.string()),
    value: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
    codesToAdd: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const perk = await ctx.db.get(args.perkId);
    if (!perk) throw new Error("Perk not found");
    const patch: {
      company?: string;
      title?: string;
      value?: string;
      description?: string;
      active?: boolean;
      updatedAt: number;
    } = { updatedAt: Date.now() };
    if (args.company !== undefined) patch.company = args.company.trim();
    if (args.title !== undefined) patch.title = args.title.trim();
    if (args.value !== undefined) patch.value = args.value.trim();
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.active !== undefined) patch.active = args.active;
    await ctx.db.patch(perk._id, patch);

    if (perk.type === "code" && args.codesToAdd) {
      const existing = await ctx.db
        .query("perkCodes")
        .withIndex("by_perk", (q) => q.eq("perkId", perk._id))
        .collect();
      const have = new Set(existing.map((row) => row.code));
      for (const raw of args.codesToAdd) {
        const code = raw.trim();
        if (!code || have.has(code)) continue;
        await ctx.db.insert("perkCodes", {
          perkId: perk._id,
          code,
          available: true,
        });
        have.add(code);
      }
    }
    return null;
  },
});

export const adminApplications = adminQuery({
  args: {
    status: v.optional(claimStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("perkClaims"),
      perkId: v.id("perks"),
      title: v.string(),
      company: v.string(),
      userId: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      status: claimStatusValidator,
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const claims = args.status
      ? await ctx.db
          .query("perkClaims")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("perkClaims").collect();
    const emailClaims = claims.filter((claim) => claim.type === "email");
    const rows = [];
    for (const claim of emailClaims) {
      const perk = await ctx.db.get(claim.perkId);
      const user = await ctx.db.get(claim.userId);
      if (!perk) continue;
      rows.push({
        _id: claim._id,
        perkId: claim.perkId,
        title: perk.title,
        company: perk.company,
        userId: claim.userId,
        email: user?.email,
        name: user?.name,
        status: claim.status,
        createdAt: claim.createdAt,
      });
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const adminSetApplicationStatus = adminMutation({
  args: {
    claimId: v.id("perkClaims"),
    status: v.union(v.literal("pending"), v.literal("added"), v.literal("rejected")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new Error("Application not found");
    if (claim.type !== "email") {
      throw new Error("Only email perk applications can be reviewed here");
    }
    await ctx.db.patch(claim._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});
