import { v } from "convex/values";
import {
  adminMutation,
  adminQuery,
  onboardedMutation,
  onboardedQuery,
} from "./lib/customFunctions";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const HACKATHON_SETTINGS_KEY = "hackathon";

const DEFAULT_TRACKS = [
  {
    slug: "maisa",
    label: "Maisa",
    note: "Agentes de IA con trazabilidad para la empresa",
    body: "Construye «Digital Workers»: agentes de IA auditables que automatizan procesos completos en banca, seguros e industria. Cerró 25M$ liderados por Creandum y Forgepoint para atacar el 95% de proyectos de IA empresarial que fracasan.",
    sortOrder: 0,
  },
  {
    slug: "happyrobot",
    label: "HappyRobot",
    note: "El sistema operativo de IA de la economía real",
    body: "Agentes de IA que ejecutan operaciones completas por voz, email, chat y sistemas empresariales. Con más de 150 grandes clientes y un crecimiento de 5× desde su Serie B, levantó una Serie C de 150M$ que la valora en 1.200M$.",
    sortOrder: 1,
  },
  {
    slug: "prosper-ai",
    label: "Prosper AI",
    note: "IA para las operaciones sanitarias",
    body: "Automatiza de punta a punta el recorrido del paciente en clínicas de EE. UU.: citas, verificación de seguros y facturación. Gestiona flujos de más de 150.000 médicos y levantó 30M$ liderados por a16z.",
    sortOrder: 2,
  },
  {
    slug: "embat",
    label: "Embat",
    note: "El sistema operativo de la tesorería europea",
    body: "Tesorería en tiempo real con IA para equipos financieros de medianas y grandes empresas. Automatiza hasta el 80% del trabajo manual, con 400 clientes en Europa y una Serie B de 30M€ liderada por Cathay Innovation.",
    sortOrder: 3,
  },
  {
    slug: "theker",
    label: "THEKER Robotics",
    note: "Robótica de propósito general made in Spain",
    body: "Robots industriales reconfigurables, entrenados con IA para no especializarse en una sola tarea. Desde Barcelona, con la mayor Serie A de robótica de Europa: más de 100M$ liderados por CRV, con Samsung, LVMH e Inditex dentro.",
    sortOrder: 4,
  },
] as const;

const RETIRED_SLUGS = ["ml", "non-tech"] as const;

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
        label: track.label,
        body: track.body,
        note: track.note,
        sortOrder: track.sortOrder,
        active: true,
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

  for (const slug of RETIRED_SLUGS) {
    const leftover = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (leftover?.active) {
      await ctx.db.patch(leftover._id, { active: false });
    }
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

export const ensureCatalog = onboardedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await seedDefaults(ctx);
    return null;
  },
});

export const syncOfficialTracks = internalMutation({
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
    if (!track) throw new Error("Reto no encontrado");
    const patch: {
      label?: string;
      body?: string;
      note?: string;
      active?: boolean;
      sortOrder?: number;
    } = {};
    if (args.label !== undefined) {
      const label = args.label.trim();
      if (!label) throw new Error("El nombre es obligatorio");
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
