import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { getDb } from "../db";
import { hackathonSignups } from "../db/schema";
import { sendSignupCancellationEmail } from "./signup-confirmation-email";

interface ReservedSignupCancellation {
  email: string;
  fullName: string;
  managementToken: string;
  requestedAt: string;
  signupId: string;
}

type SignupCancellationLinkResult = "failed" | "sent" | "skipped";

const RESEND_COOLDOWN_MS = 60 * 60 * 1000;

export async function sendSignupCancellationLink(
  email: string
): Promise<SignupCancellationLinkResult> {
  const signup = await reserveSignupCancellationEmail(email);
  if (!signup) {
    return "skipped";
  }

  const emailResult = await sendSignupCancellationEmail(signup);
  if (emailResult.ok) {
    return "sent";
  }

  await releaseSignupCancellationEmail(signup.signupId, signup.requestedAt);
  return "failed";
}

async function reserveSignupCancellationEmail(
  email: string
): Promise<ReservedSignupCancellation | null> {
  const db = getDb();
  const requestedAt = new Date();
  const resendCutoff = new Date(requestedAt.getTime() - RESEND_COOLDOWN_MS);
  const [signup] = await db
    .update(hackathonSignups)
    .set({ cancellationEmailSentAt: requestedAt })
    .where(
      and(
        eq(hackathonSignups.email, email),
        inArray(hackathonSignups.approvalStatus, [
          "accepted",
          "confirmed",
          "pending",
          "waitlist",
        ]),
        isNull(hackathonSignups.cancelledAt),
        or(
          isNull(hackathonSignups.cancellationEmailSentAt),
          lt(hackathonSignups.cancellationEmailSentAt, resendCutoff)
        )
      )
    )
    .returning({
      email: hackathonSignups.email,
      fullName: hackathonSignups.fullName,
      managementToken: hackathonSignups.managementToken,
      signupId: hackathonSignups.id,
    });

  return signup ? { ...signup, requestedAt: requestedAt.toISOString() } : null;
}

async function releaseSignupCancellationEmail(
  signupId: string,
  requestedAt: string
): Promise<void> {
  const db = getDb();
  await db
    .update(hackathonSignups)
    .set({ cancellationEmailSentAt: null })
    .where(
      and(
        eq(hackathonSignups.id, signupId),
        eq(hackathonSignups.cancellationEmailSentAt, new Date(requestedAt))
      )
    );
}
