import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

export function signupIsAccepted(signup: Doc<"signups"> | null): boolean {
  return signup?.accepted === true;
}

export async function requireAccepted(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (user.role === "admin") return user;
  const signup = await getSignupForUser(ctx, user);
  if (!signup) {
    throw new Error("No hackathon signup found for this email");
  }
  if (!signupIsAccepted(signup)) {
    throw new Error("You have not been accepted yet");
  }
  return user;
}

export async function requireOnboarded(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (user.role === "admin") return user;
  const signup = await getSignupForUser(ctx, user);
  if (!signup) {
    throw new Error("No hackathon signup found for this email");
  }
  if (!signupIsAccepted(signup)) {
    throw new Error("You have not been accepted yet");
  }
  if (!user.onboardingComplete) {
    throw new Error("Confirm your details first");
  }
  return user;
}

export async function getSignupForUser(
  ctx: Ctx,
  user: Doc<"users">,
): Promise<Doc<"signups"> | null> {
  if (user.signupId) {
    const byId = await ctx.db.get(user.signupId);
    if (byId) return byId;
  }
  if (!user.email) return null;
  return await findSignupByEmail(ctx, user.email);
}

export async function findSignupByEmail(
  ctx: Ctx,
  email: string,
): Promise<Doc<"signups"> | null> {
  return await ctx.db
    .query("signups")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
}

export async function findUserByEmail(
  ctx: Ctx,
  email: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();
}
