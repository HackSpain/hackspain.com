import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { hackathonPreSignups, hackathonSignups } from "../db/schema";
import { sendPreSignupInvitationEmail } from "../lib/signup-confirmation-email";

export interface PreSignupInvitationWorkflowInput {
  email: string;
  fullName: string;
  preSignupId: string;
  signupUrl: string;
}

export async function handlePreSignupInvitation(
  input: PreSignupInvitationWorkflowInput
) {
  "use workflow";

  const shouldSend = await shouldSendPreSignupInvitationStep(
    input.preSignupId
  );
  if (!shouldSend) {
    return { status: "skipped" };
  }
  await sendPreSignupInvitationEmailStep(input);
  await markPreSignupInvitationSentStep(input.preSignupId);
  return { status: "sent" };
}

async function shouldSendPreSignupInvitationStep(
  preSignupId: string
): Promise<boolean> {
  "use step";

  const db = getDb();
  const [preSignup] = await db
    .select({
      email: hackathonPreSignups.email,
      signupCompletedAt: hackathonPreSignups.signupCompletedAt,
      signupInviteSentAt: hackathonPreSignups.signupInviteSentAt,
    })
    .from(hackathonPreSignups)
    .where(eq(hackathonPreSignups.id, preSignupId))
    .limit(1);
  if (
    !preSignup ||
    preSignup.signupCompletedAt ||
    preSignup.signupInviteSentAt
  ) {
    return false;
  }

  const [existingSignup] = await db
    .select({ createdAt: hackathonSignups.createdAt })
    .from(hackathonSignups)
    .where(eq(hackathonSignups.email, preSignup.email))
    .limit(1);
  if (!existingSignup) {
    return true;
  }

  await db
    .update(hackathonPreSignups)
    .set({ signupCompletedAt: existingSignup.createdAt })
    .where(eq(hackathonPreSignups.id, preSignupId));
  return false;
}

async function sendPreSignupInvitationEmailStep(
  input: PreSignupInvitationWorkflowInput
) {
  "use step";

  const result = await sendPreSignupInvitationEmail(input);
  if (!result.ok) {
    throw new Error(
      `pre-signup invitation email failed: ${result.reason}${result.detail ? ` (${result.detail})` : ""}`
    );
  }

  return result;
}

async function markPreSignupInvitationSentStep(
  preSignupId: string
): Promise<void> {
  "use step";

  const db = getDb();
  await db
    .update(hackathonPreSignups)
    .set({ signupInviteSentAt: new Date() })
    .where(eq(hackathonPreSignups.id, preSignupId));
}
