import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { getDb } from "../db";
import { hackathonSignups } from "../db/schema";
import { sendSignupCancellationEmail } from "../lib/signup-confirmation-email";

interface SignupCancellationLinkWorkflowInput {
  email: string;
}

interface ReservedSignupCancellation {
  cancellationToken: string;
  email: string;
  fullName: string;
  requestedAt: string;
  signupId: string;
}

const RESEND_COOLDOWN_MS = 60 * 60 * 1000;

export async function handleSignupCancellationLink(
  input: SignupCancellationLinkWorkflowInput
) {
  "use workflow";

  const signup = await reserveSignupCancellationEmailStep(input.email);
  if (!signup) {
    return { status: "skipped" };
  }

  const emailWasSent = await sendSignupCancellationEmailStep(signup);
  if (!emailWasSent) {
    await releaseSignupCancellationEmailStep(
      signup.signupId,
      signup.requestedAt
    );
    return { status: "failed" };
  }

  return { status: "sent" };
}

async function reserveSignupCancellationEmailStep(
  email: string
): Promise<ReservedSignupCancellation | null> {
  "use step";

  const db = getDb();
  const requestedAt = new Date();
  const resendCutoff = new Date(requestedAt.getTime() - RESEND_COOLDOWN_MS);
  const [signup] = await db
    .update(hackathonSignups)
    .set({ cancellationEmailSentAt: requestedAt })
    .where(
      and(
        eq(hackathonSignups.email, email),
        inArray(hackathonSignups.approvalStatus, ["approved", "pending"]),
        isNull(hackathonSignups.cancelledAt),
        or(
          isNull(hackathonSignups.cancellationEmailSentAt),
          lt(hackathonSignups.cancellationEmailSentAt, resendCutoff)
        )
      )
    )
    .returning({
      cancellationToken: hackathonSignups.cancellationToken,
      email: hackathonSignups.email,
      fullName: hackathonSignups.fullName,
      signupId: hackathonSignups.id,
    });

  return signup ? { ...signup, requestedAt: requestedAt.toISOString() } : null;
}

async function sendSignupCancellationEmailStep(
  signup: ReservedSignupCancellation
): Promise<boolean> {
  "use step";

  const result = await sendSignupCancellationEmail(signup);
  return result.ok;
}

async function releaseSignupCancellationEmailStep(
  signupId: string,
  requestedAt: string
): Promise<void> {
  "use step";

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
