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

type PreSignupInvitationEmailWorkflowInput =
  PreSignupInvitationWorkflowInput & { shareCode: string };

export async function handlePreSignupInvitation(
  input: PreSignupInvitationWorkflowInput
) {
  "use workflow";

  const shareCode = await eligiblePreSignupReminderShareCodeStep(
    input.preSignupId
  );
  if (!shareCode) {
    return { status: "skipped" };
  }
  await sendPreSignupInvitationEmailStep({ ...input, shareCode });
  await markPreSignupReminderSentStep(input.preSignupId);
  return { status: "sent" };
}

async function eligiblePreSignupReminderShareCodeStep(
  preSignupId: string
): Promise<string | null> {
  "use step";

  const db = getDb();
  const [preSignup] = await db
    .select({
      email: hackathonPreSignups.email,
      shareCode: hackathonPreSignups.shareCode,
      signupCompletedAt: hackathonPreSignups.signupCompletedAt,
      signupInviteSentAt: hackathonPreSignups.signupInviteSentAt,
      signupReminderSentAt: hackathonPreSignups.signupReminderSentAt,
    })
    .from(hackathonPreSignups)
    .where(eq(hackathonPreSignups.id, preSignupId))
    .limit(1);
  if (
    !preSignup ||
    preSignup.signupCompletedAt ||
    preSignup.signupReminderSentAt ||
    !preSignup.signupInviteSentAt
  ) {
    return null;
  }

  const [existingSignup] = await db
    .select({ createdAt: hackathonSignups.createdAt })
    .from(hackathonSignups)
    .where(eq(hackathonSignups.email, preSignup.email))
    .limit(1);
  if (!existingSignup) {
    return preSignup.shareCode;
  }

  await db
    .update(hackathonPreSignups)
    .set({ signupCompletedAt: existingSignup.createdAt })
    .where(eq(hackathonPreSignups.id, preSignupId));
  return null;
}

async function sendPreSignupInvitationEmailStep(
  input: PreSignupInvitationEmailWorkflowInput
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

async function markPreSignupReminderSentStep(
  preSignupId: string
): Promise<void> {
  "use step";

  const db = getDb();
  await db
    .update(hackathonPreSignups)
    .set({ signupReminderSentAt: new Date() })
    .where(eq(hackathonPreSignups.id, preSignupId));
}
