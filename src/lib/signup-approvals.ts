import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { hackathonSignups } from "../db/schema";
import { sendSignupAcceptedEmail } from "./signup-confirmation-email";

type SignupReviewDecision = "approve" | "reject";

type SignupReviewResult =
  | {
      ok: true;
      outcome:
        | "already_approved"
        | "approved"
        | "approved_email_pending"
        | "rejected";
      emailFailureReason?: string;
    }
  | { ok: false; reason: "already_rejected" | "not_found" | "not_reversible" };

export async function reviewSignup(
  signupId: string,
  decision: SignupReviewDecision
): Promise<SignupReviewResult> {
  const db = getDb();
  const [signup] = await db
    .select()
    .from(hackathonSignups)
    .where(eq(hackathonSignups.id, signupId))
    .limit(1);

  if (!signup) {
    return { ok: false, reason: "not_found" };
  }

  if (decision === "reject") {
    if (signup.approvalStatus === "approved") {
      return { ok: false, reason: "not_reversible" };
    }
    if (signup.approvalStatus === "cancelled") {
      return { ok: false, reason: "not_reversible" };
    }
    if (signup.approvalStatus === "rejected") {
      return { ok: false, reason: "already_rejected" };
    }
    await db
      .update(hackathonSignups)
      .set({ approvalStatus: "rejected", reviewedAt: new Date() })
      .where(eq(hackathonSignups.id, signup.id));
    return { ok: true, outcome: "rejected" };
  }

  if (signup.approvalStatus === "rejected") {
    return { ok: false, reason: "already_rejected" };
  }
  if (signup.approvalStatus === "cancelled") {
    return { ok: false, reason: "not_reversible" };
  }

  if (signup.approvalStatus === "pending") {
    await db
      .update(hackathonSignups)
      .set({ approvalStatus: "approved", reviewedAt: new Date() })
      .where(eq(hackathonSignups.id, signup.id));
  }

  if (signup.approvalEmailSentAt) {
    return { ok: true, outcome: "already_approved" };
  }

  const emailResult = await sendSignupAcceptedEmail({
    email: signup.email,
    fullName: signup.fullName,
    signupId: signup.id,
  });
  if (!emailResult.ok) {
    return {
      ok: true,
      outcome: "approved_email_pending",
      emailFailureReason: emailResult.reason,
    };
  }

  await db
    .update(hackathonSignups)
    .set({ approvalEmailSentAt: new Date() })
    .where(eq(hackathonSignups.id, signup.id));
  return { ok: true, outcome: "approved" };
}
