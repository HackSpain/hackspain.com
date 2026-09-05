import { v } from "convex/values";
import {
  onboardedMutation,
  onboardedQuery,
} from "./lib/customFunctions";
import {
  identifierTypeValidator,
  teamMemberStatusValidator,
} from "./lib/validators";
import {
  normalizeEmail,
  normalizeGithub,
  normalizeTwitter,
} from "./lib/normalize";
import { membershipForUser } from "./lib/team";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const memberReturn = v.object({
  _id: v.id("teamMembers"),
  identifierType: identifierTypeValidator,
  identifier: v.string(),
  status: teamMemberStatusValidator,
  userId: v.optional(v.id("users")),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
});

const teamReturn = v.object({
  _id: v.id("teams"),
  name: v.string(),
  ownerId: v.id("users"),
  isOwner: v.boolean(),
  createdAt: v.number(),
  members: v.array(memberReturn),
});

async function hydrateMember(
  ctx: QueryCtx | MutationCtx,
  member: Doc<"teamMembers">,
) {
  const user = member.userId ? await ctx.db.get(member.userId) : null;
  const signup = member.signupId ? await ctx.db.get(member.signupId) : null;
  return {
    _id: member._id,
    identifierType: member.identifierType,
    identifier: member.identifier,
    status: member.status,
    userId: member.userId,
    name: user?.name ?? signup?.fullName,
    email: user?.email ?? signup?.email,
  };
}

async function resolveIdentifier(
  ctx: MutationCtx,
  identifierType: "email" | "github" | "twitter",
  raw: string,
): Promise<{
  identifier: string;
  userId?: Id<"users">;
  signupId?: Id<"signups">;
  status: "member" | "pending";
}> {
  const identifier =
    identifierType === "email"
      ? normalizeEmail(raw)
      : identifierType === "github"
        ? normalizeGithub(raw)
        : normalizeTwitter(raw);
  if (!identifier) {
    throw new Error("Introduce un usuario de GitHub, un handle de X o un email válido");
  }

  let signup: Doc<"signups"> | null = null;
  if (identifierType === "email") {
    signup = await ctx.db
      .query("signups")
      .withIndex("by_email", (q) => q.eq("email", identifier))
      .unique();
  } else if (identifierType === "github") {
    signup = await ctx.db
      .query("signups")
      .withIndex("by_github", (q) => q.eq("githubUsername", identifier))
      .unique();
  } else {
    signup = await ctx.db
      .query("signups")
      .withIndex("by_twitter", (q) => q.eq("twitterHandle", identifier))
      .unique();
  }

  let user: Doc<"users"> | null = null;
  if (identifierType === "email") {
    user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identifier))
      .unique();
  } else if (identifierType === "github") {
    user = await ctx.db
      .query("users")
      .withIndex("by_github", (q) => q.eq("githubUsername", identifier))
      .first();
  }
  if (!user && signup) {
    user = await ctx.db
      .query("users")
      .withIndex("by_signup", (q) => q.eq("signupId", signup._id))
      .unique();
  }

  return {
    identifier,
    userId: user?._id,
    signupId: signup?._id,
    status: user ? "member" : "pending",
  };
}

export const mine = onboardedQuery({
  args: {},
  returns: v.union(teamReturn, v.null()),
  handler: async (ctx) => {
    const membership = await membershipForUser(ctx, ctx.user._id);
    const team = membership
      ? await ctx.db.get(membership.teamId)
      : await ctx.db
          .query("teams")
          .withIndex("by_owner", (q) => q.eq("ownerId", ctx.user._id))
          .unique();
    if (!team) return null;
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();
    return {
      _id: team._id,
      name: team.name,
      ownerId: team.ownerId,
      isOwner: team.ownerId === ctx.user._id,
      createdAt: team.createdAt,
      members: await Promise.all(members.map((m) => hydrateMember(ctx, m))),
    };
  },
});

const memberInputValidator = v.object({
  identifierType: identifierTypeValidator,
  identifier: v.string(),
});

async function insertMember(
  ctx: MutationCtx,
  team: Doc<"teams">,
  addedBy: Id<"users">,
  identifierType: "email" | "github" | "twitter",
  identifier: string,
): Promise<Id<"teamMembers">> {
  const resolved = await resolveIdentifier(ctx, identifierType, identifier);
  const already = await ctx.db
    .query("teamMembers")
    .withIndex("by_identifier", (q) =>
      q.eq("identifierType", identifierType).eq("identifier", resolved.identifier),
    )
    .collect();
  const onThisTeam = already.find((row) => row.teamId === team._id);
  if (onThisTeam) throw new Error("Esa persona ya está en este equipo");
  if (already.some((row) => row.teamId !== team._id)) {
    throw new Error(
      "Esa persona ya tiene invitación o membresía en otro equipo",
    );
  }
  if (resolved.userId) {
    const other = await membershipForUser(ctx, resolved.userId);
    if (other) throw new Error("Esa persona ya pertenece a otro equipo");
  }
  if (resolved.signupId) {
    const bySignup = await ctx.db
      .query("teamMembers")
      .withIndex("by_signup", (q) => q.eq("signupId", resolved.signupId))
      .collect();
    if (bySignup.some((row) => row.teamId === team._id)) {
      throw new Error("Esa persona ya está en este equipo");
    }
    if (bySignup.length > 0) {
      throw new Error(
        "Esa persona ya tiene invitación o membresía en otro equipo",
      );
    }
  }

  return await ctx.db.insert("teamMembers", {
    teamId: team._id,
    userId: resolved.userId,
    signupId: resolved.signupId,
    identifierType,
    identifier: resolved.identifier,
    status: resolved.status,
    addedBy,
    createdAt: Date.now(),
  });
}

export const create = onboardedMutation({
  args: {
    name: v.string(),
    members: v.optional(v.array(memberInputValidator)),
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2) throw new Error("El nombre del equipo debe tener al menos 2 caracteres");
    const existing = await membershipForUser(ctx, ctx.user._id);
    if (existing) throw new Error("Ya perteneces a un equipo");

    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      name,
      ownerId: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: ctx.user._id,
      signupId: ctx.user.signupId,
      identifierType: "email",
      identifier: ctx.user.email ?? ctx.user._id,
      status: "member",
      addedBy: ctx.user._id,
      createdAt: now,
    });

    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Equipo no encontrado");
    for (const member of args.members ?? []) {
      if (!member.identifier.trim()) continue;
      await insertMember(
        ctx,
        team,
        ctx.user._id,
        member.identifierType,
        member.identifier,
      );
    }
    return teamId;
  },
});

export const rename = onboardedMutation({
  args: { teamId: v.id("teams"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Equipo no encontrado");
    if (team.ownerId !== ctx.user._id) throw new Error("Solo el dueño puede cambiar el nombre");
    const name = args.name.trim();
    if (name.length < 2) throw new Error("El nombre del equipo debe tener al menos 2 caracteres");
    await ctx.db.patch(team._id, { name, updatedAt: Date.now() });
    return null;
  },
});

export const addMember = onboardedMutation({
  args: {
    teamId: v.id("teams"),
    identifierType: identifierTypeValidator,
    identifier: v.string(),
  },
  returns: v.id("teamMembers"),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Equipo no encontrado");
    if (team.ownerId !== ctx.user._id) {
      throw new Error("Solo el dueño puede añadir miembros");
    }
    return await insertMember(
      ctx,
      team,
      ctx.user._id,
      args.identifierType,
      args.identifier,
    );
  },
});

export const leave = onboardedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const membership = await membershipForUser(ctx, ctx.user._id);
    if (!membership) throw new Error("No estás en un equipo");
    const team = await ctx.db.get(membership.teamId);
    if (team && team.ownerId === ctx.user._id) {
      throw new Error("El dueño no puede salir del equipo");
    }
    await ctx.db.delete(membership._id);
    return null;
  },
});

export const removeMember = onboardedMutation({
  args: { memberId: v.id("teamMembers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Miembro no encontrado");
    const team = await ctx.db.get(member.teamId);
    if (!team) throw new Error("Equipo no encontrado");
    if (team.ownerId !== ctx.user._id) {
      throw new Error("Solo el dueño puede quitar miembros");
    }
    if (member.userId === team.ownerId) {
      throw new Error("No se puede quitar al dueño");
    }
    await ctx.db.delete(member._id);
    return null;
  },
});
