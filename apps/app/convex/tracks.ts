import { v } from "convex/values";
import {
  adminMutation,
  adminQuery,
  onboardedQuery,
} from "./lib/customFunctions";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const HACKATHON_SETTINGS_KEY = "hackathon";

const DEFAULT_TRACKS = [
  {
    slug: "ml",
    label: "ML TRACK",
    body: "ML challenges using free computing resources.",
    note: "FREE COMPUTE",
    sortOrder: 0,
  },
  {
    slug: "non-tech",
    label: "NON-TECH TRACK",
    body: "We'll teach non-technical people how to code high-quality software.",
    note: "FOR EVERYONE",
    sortOrder: 1,
  },
] as const;

const trackReturn = v.object({
  _id: v.id("tracks"),
  slug: v.string(),
  label: v.string(),
  body: v.string(),
  note: v.string(),
  sortOrder: v.number(),
  active: v.boolean(),
});

function trackFields(track: Doc<"tracks">) {
  return {
    _id: track._id,
    slug: track.slug,
    label: track.label,
    body: track.body,
    note: track.note,
    sortOrder: track.sortOrder,
    active: track.active,
  };
}

async function settingsDoc(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", HACKATHON_SETTINGS_KEY))
    .unique();
}

export async function submissionsAreOpen(
  ctx: QueryCtx | MutationCtx,
): Promise<boolean> {
  const row = await settingsDoc(ctx);
  return row?.submissionsOpen ?? false;
}

export async function seedDefaults(ctx: MutationCtx): Promise<void> {
  for (const track of DEFAULT_TRACKS) {
    const existing = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", track.slug))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        label: existing.label || track.label,
        body: existing.body || track.body,
        note: existing.note || track.note,
      });
      continue;
    }
    await ctx.db.insert("tracks", {
      slug: track.slug,
      label: track.label,
      body: track.body,
      note: track.note,
      sortOrder: track.sortOrder,
      active: true,
    });
  }

  const settings = await settingsDoc(ctx);
  if (!settings) {
    await ctx.db.insert("settings", {
      key: HACKATHON_SETTINGS_KEY,
      submissionsOpen: false,
    });
  }
}

export const list = onboardedQuery({
  args: {},
  returns: v.array(trackReturn),
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_active_and_sort", (q) => q.eq("active", true))
      .collect();
    return tracks
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(trackFields);
  },
});

export const settings = onboardedQuery({
  args: {},
  returns: v.object({ submissionsOpen: v.boolean() }),
  handler: async (ctx) => ({
    submissionsOpen: await submissionsAreOpen(ctx),
  }),
});

export const adminList = adminQuery({
  args: {},
  returns: v.array(trackReturn),
  handler: async (ctx) => {
    const tracks = await ctx.db.query("tracks").collect();
    return tracks.sort((a, b) => a.sortOrder - b.sortOrder).map(trackFields);
  },
});

export const adminSettings = adminQuery({
  args: {},
  returns: v.object({ submissionsOpen: v.boolean() }),
  handler: async (ctx) => ({
    submissionsOpen: await submissionsAreOpen(ctx),
  }),
});

export const adminEnsureDefaults = adminMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await seedDefaults(ctx);
    return null;
  },
});

export const adminSetSubmissionsOpen = adminMutation({
  args: { submissionsOpen: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await settingsDoc(ctx);
    if (row) {
      await ctx.db.patch(row._id, { submissionsOpen: args.submissionsOpen });
    } else {
      await ctx.db.insert("settings", {
        key: HACKATHON_SETTINGS_KEY,
        submissionsOpen: args.submissionsOpen,
      });
    }
    return null;
  },
});

export const adminUpdate = adminMutation({
  args: {
    trackId: v.id("tracks"),
    label: v.optional(v.string()),
    body: v.optional(v.string()),
    note: v.optional(v.string()),
    active: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");
    const patch: {
      label?: string;
      body?: string;
      note?: string;
      active?: boolean;
      sortOrder?: number;
    } = {};
    if (args.label !== undefined) {
      const label = args.label.trim();
      if (!label) throw new Error("Label is required");
      patch.label = label;
    }
    if (args.body !== undefined) patch.body = args.body.trim();
    if (args.note !== undefined) patch.note = args.note.trim();
    if (args.active !== undefined) patch.active = args.active;
    if (args.sortOrder !== undefined) patch.sortOrder = args.sortOrder;
    await ctx.db.patch(track._id, patch);
    return null;
  },
});
