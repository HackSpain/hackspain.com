import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  ambassadorFieldsValidator,
  signupFieldsValidator,
} from "./lib/validators";
import { normalizeEmail, normalizeGithub, normalizeTwitter } from "./lib/normalize";
import { urlOf, urlsFromRecord } from "./lib/urls";
import type { Id } from "./_generated/dataModel";

async function attachSignupToUser(
  ctx: MutationCtx,
  email: string,
  signupId: Id<"signups">,
  fullName: string,
): Promise<void> {
  const user = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();
  if (user && !user.signupId) {
    await ctx.db.patch(user._id, {
      signupId,
      name: user.name ?? fullName,
    });
  }
}

function assertMigrationSecret(secret: string): void {
  const expected = process.env.MIGRATION_SECRET;
  if (!expected) {
    throw new Error("MIGRATION_SECRET is not set on the Convex deployment");
  }
  if (secret !== expected) {
    throw new Error("Unauthorized");
  }
}

export const importSignups = mutation({
  args: {
    secret: v.string(),
    signups: v.array(signupFieldsValidator),
  },
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    let inserted = 0;
    let updated = 0;
    for (const raw of args.signups) {
      const email = normalizeEmail(raw.email);
      const urls = raw.urls;
      const githubUrl = urlOf(urls, "github");
      const xUrl = urlOf(urls, "x");
      const githubUsername = githubUrl
        ? normalizeGithub(githubUrl) || undefined
        : undefined;
      const twitterHandle = xUrl
        ? normalizeTwitter(xUrl) || undefined
        : undefined;
      const existing = await ctx.db
        .query("signups")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      // Optional fields are only written when the source provides a value.
      // Patching with undefined would delete data already in Convex (for
      // example when the Neon source lacks a column) on every re-run.
      const optionalFields: {
        achievements?: string;
        freeTime?: string;
        ambassadorMotivation?: string;
        ambassadorStudyWhere?: string;
      } = {};
      if (raw.achievements) optionalFields.achievements = raw.achievements;
      if (raw.freeTime) optionalFields.freeTime = raw.freeTime;
      if (raw.ambassadorMotivation) {
        optionalFields.ambassadorMotivation = raw.ambassadorMotivation;
      }
      if (raw.ambassadorStudyWhere) {
        optionalFields.ambassadorStudyWhere = raw.ambassadorStudyWhere;
      }
      const fields = {
        email,
        fullName: raw.fullName,
        urls,
        githubUsername,
        twitterHandle,
        wantsAmbassador: raw.wantsAmbassador,
        createdAt: raw.createdAt,
        neonId: raw.neonId,
        ...optionalFields,
      };
      if (existing) {
        await ctx.db.patch(existing._id, {
          ...fields,
          accepted: existing.accepted === true || raw.accepted === true,
        });
        updated += 1;
        await attachSignupToUser(ctx, email, existing._id, fields.fullName);
      } else {
        const signupId = await ctx.db.insert("signups", {
          ...fields,
          accepted: raw.accepted === true,
        });
        inserted += 1;
        await attachSignupToUser(ctx, email, signupId, fields.fullName);
      }
    }
    return { inserted, updated };
  },
});

export const importAmbassadors = mutation({
  args: {
    secret: v.string(),
    applications: v.array(ambassadorFieldsValidator),
  },
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    let inserted = 0;
    let updated = 0;
    for (const raw of args.applications) {
      const email = normalizeEmail(raw.email);
      const existing = await ctx.db
        .query("ambassadorApplications")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      const fields = {
        email,
        fullName: raw.fullName,
        institution: raw.institution,
        cityRegion: raw.cityRegion,
        urls: raw.urls,
        motivation: raw.motivation,
        outreachPlan: raw.outreachPlan,
        createdAt: raw.createdAt,
        neonId: raw.neonId,
      };
      if (existing) {
        await ctx.db.patch(existing._id, fields);
        updated += 1;
      } else {
        await ctx.db.insert("ambassadorApplications", fields);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

export const rewriteLegacyUrls = mutation({
  args: { secret: v.string() },
  returns: v.object({
    signupsRewritten: v.number(),
    ambassadorsRewritten: v.number(),
  }),
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    let signupsRewritten = 0;
    let ambassadorsRewritten = 0;

    for (const signup of await ctx.db.query("signups").collect()) {
      const leftoverFields = signup as typeof signup & {
        githubUrl?: string;
        xUrl?: string;
        linkedinUrl?: string;
        webUrl?: string;
      };
      const urls = urlsFromRecord(leftoverFields);
      const leftover =
        leftoverFields.githubUrl !== undefined ||
        leftoverFields.xUrl !== undefined ||
        leftoverFields.linkedinUrl !== undefined ||
        leftoverFields.webUrl !== undefined ||
        leftoverFields.urls === undefined;
      if (!leftover) continue;
      await ctx.db.replace(signup._id, {
        email: signup.email,
        fullName: signup.fullName,
        urls,
        githubUsername: signup.githubUsername,
        twitterHandle: signup.twitterHandle,
        achievements: signup.achievements,
        freeTime: signup.freeTime,
        wantsAmbassador: signup.wantsAmbassador,
        ambassadorMotivation: signup.ambassadorMotivation,
        ambassadorStudyWhere: signup.ambassadorStudyWhere,
        accepted: signup.accepted === true,
        createdAt: signup.createdAt,
        neonId: signup.neonId,
      });
      signupsRewritten += 1;
    }

    for (const application of await ctx.db.query("ambassadorApplications").collect()) {
      const leftoverFields = application as typeof application & {
        githubUrl?: string;
        xUrl?: string;
        linkedinUrl?: string;
        webUrl?: string;
      };
      const urls = urlsFromRecord(leftoverFields);
      const leftover =
        leftoverFields.githubUrl !== undefined ||
        leftoverFields.xUrl !== undefined ||
        leftoverFields.linkedinUrl !== undefined ||
        leftoverFields.webUrl !== undefined ||
        leftoverFields.urls === undefined;
      if (!leftover) continue;
      await ctx.db.replace(application._id, {
        email: application.email,
        fullName: application.fullName,
        institution: application.institution,
        cityRegion: application.cityRegion,
        urls,
        motivation: application.motivation,
        outreachPlan: application.outreachPlan,
        createdAt: application.createdAt,
        neonId: application.neonId,
      });
      ambassadorsRewritten += 1;
    }

    return { signupsRewritten, ambassadorsRewritten };
  },
});
