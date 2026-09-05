import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { normalizeEmail } from "./lib/normalize";

export const STUB_CODE = "00000000";

export function emailOtpStubEnabled(): boolean {
  return (
    !process.env.AUTH_RESEND_KEY && process.env.ALLOW_EMAIL_OTP_STUB === "true"
  );
}

export const remember = internalMutation({
  args: { email: v.string(), code: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("devOtpCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { code: args.code, expiresAt: args.expiresAt });
      return;
    }
    await ctx.db.insert("devOtpCodes", { email, code: args.code, expiresAt: args.expiresAt });
  },
});

export const lookup = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("devOtpCodes")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(args.email)))
      .unique();
    if (!row || row.expiresAt < Date.now()) return null;
    return row.code;
  },
});
