import { captureException, captureMessage, withScope } from "@sentry/astro";
import type { APIRoute } from "astro";
import { checkBotId } from "botid/server";
import { eq } from "drizzle-orm";
import { areSignupsClosed } from "../../data/signup-deadline";
import { getDb } from "../../db";
import { hackathonPreSignups, hackathonSignups } from "../../db/schema";
import {
  notifyDiscordNewSignup,
  notifyDiscordSignupApiIssue,
} from "../../lib/discord-signup-webhook";
import { sendSignupConfirmationEmail } from "../../lib/signup-confirmation-email";
import { parseSignupBody } from "../../lib/signup-validation";

export const prerender = false;

/** Sentry must never break request handling if the SDK misbehaves. */
function safeSentry(report: () => void): void {
  try {
    report();
  } catch (e) {
    console.error("[signup] Sentry reporting failed:", e);
  }
}

function emptyToNull(s: string): string | null {
  return s.length === 0 ? null : s;
}

/** Drizzle wraps Postgres/Neon errors; `23505` unique violation lives on `cause`. */
function isPostgresUniqueViolation(e: unknown): boolean {
  const seen = new Set<unknown>();
  let cur: unknown = e;
  for (let depth = 0; depth < 14 && cur != null; depth++) {
    if (seen.has(cur)) {
      break;
    }
    seen.add(cur);
    if (
      typeof cur === "object" &&
      cur !== null &&
      "code" in cur &&
      (cur as { code: unknown }).code === "23505"
    ) {
      return true;
    }
    if (cur instanceof Error && cur.cause != null) {
      cur = cur.cause;
      continue;
    }
    if (typeof cur === "object" && cur !== null && "cause" in cur) {
      const next = (cur as { cause: unknown }).cause;
      if (next == null) {
        break;
      }
      cur = next;
      continue;
    }
    break;
  }
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  // The client hides the form after the deadline, but its clock is not the
  // authority: nothing is accepted past the deadline, whatever the caller says.
  if (areSignupsClosed()) {
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "signups_closed");
        captureMessage("POST /api/signup after the deadline", "info");
      });
    });
    return Response.json({ error: "signups_closed" }, { status: 410 });
  }

  // `vercel.json` Bot Protection rewrites only run on Vercel / `vercel dev`, not `astro dev`.
  // Without them, client scripts 404 and BotID checks misbehave; skip locally.
  if (!import.meta.env.DEV) {
    try {
      const verification = await checkBotId();
      if (verification.isBot) {
        safeSentry(() => {
          withScope((scope) => {
            scope.setTag("api", "signup");
            scope.setTag("outcome", "access_denied");
            scope.setContext("signup", { reason: "botid" });
            captureMessage("POST /api/signup blocked (BotID)", "warning");
          });
        });
        return Response.json({ error: "access_denied" }, { status: 403 });
      }
    } catch (e) {
      safeSentry(() => {
        withScope((scope) => {
          scope.setTag("api", "signup");
          scope.setTag("outcome", "botid_check_failed");
          captureException(e);
        });
      });
      console.error("BotID check failed:", e);
    }
  }

  if (
    request.headers.get("content-type")?.split(";")[0]?.trim() !==
    "application/json"
  ) {
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "expected_json");
        captureMessage("POST /api/signup: wrong Content-Type", "warning");
      });
    });
    return Response.json({ error: "expected_json" }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await notifyDiscordSignupApiIssue({
      status: 400,
      error: "Invalid JSON",
    });
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "invalid_json");
        captureMessage("POST /api/signup: body is not valid JSON", "warning");
      });
    });
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    await notifyDiscordSignupApiIssue({
      status: 400,
      error: "invalid_body",
    });
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "invalid_body");
        captureMessage(
          "POST /api/signup: body missing or not object",
          "warning"
        );
      });
    });
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = parseSignupBody(body);
  if (!parsed.ok) {
    await notifyDiscordSignupApiIssue({
      status: 400,
      error: parsed.error,
    });
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "validation");
        scope.setContext("details", {
          error: parsed.error,
          status: parsed.status,
        });
        captureMessage("POST /api/signup: validation failed", "warning");
      });
    });
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  const {
    fullName,
    email,
    xUrl,
    linkedinUrl,
    githubUrl,
    webUrl,
    achievements,
    freeTime,
    dietaryRestrictions,
    dietaryDetails,
    dietaryDataConsent,
    occupationStatuses,
    studyInstitution,
    employer,
    wantsAmbassador,
    ambassadorMotivation,
    heardFrom,
    referralCode,
    invitationToken,
  } = parsed.data;

  const motivationDb = wantsAmbassador
    ? emptyToNull(ambassadorMotivation)
    : null;
  const hasDietaryData =
    dietaryRestrictions.length > 0 || dietaryDetails.length > 0;

  let relatedPreSignupId: string | null = null;
  let relatedPreSignupReferralCode: string | null = null;
  const signupId = crypto.randomUUID();
  /*
   * On a resubmission the existing row is updated and keeps its original id, so
   * everything downstream (the confirmation email's idempotency key and entity
   * ref) has to use the id that came back — not the one generated here, which
   * would point at a row that does not exist.
   */
  let savedSignupId: string = signupId;

  try {
    const db = getDb();

    if (invitationToken) {
      const [preSignup] = await db
        .select({
          email: hackathonPreSignups.email,
          id: hackathonPreSignups.id,
          referralCode: hackathonPreSignups.referralCode,
          signupCompletedAt: hackathonPreSignups.signupCompletedAt,
        })
        .from(hackathonPreSignups)
        .where(eq(hackathonPreSignups.signupToken, invitationToken))
        .limit(1);
      if (!preSignup) {
        return Response.json({ error: "invalid_invitation" }, { status: 400 });
      }
      if (preSignup.signupCompletedAt) {
        return Response.json({ error: "invitation_used" }, { status: 409 });
      }
      if (preSignup.email !== email) {
        return Response.json(
          { error: "invitation_email_mismatch" },
          { status: 400 }
        );
      }
      relatedPreSignupId = preSignup.id;
      relatedPreSignupReferralCode = preSignup.referralCode;
    } else {
      const [preSignup] = await db
        .select({
          id: hackathonPreSignups.id,
          referralCode: hackathonPreSignups.referralCode,
        })
        .from(hackathonPreSignups)
        .where(eq(hackathonPreSignups.email, email))
        .limit(1);
      relatedPreSignupId = preSignup?.id ?? null;
      relatedPreSignupReferralCode = preSignup?.referralCode ?? null;
    }

    try {
      /*
       * Applying again replaces the application. Email is the key, so this is
       * how someone corrects a submission — there is no edit page, and the
       * previous behaviour (409, record untouched) left people who had sent a
       * blank or wrong form with no way to fix it.
       *
       * `set` deliberately lists only the answers. id, email, created_at,
       * management_token, approval_status, cancelled_at, came_from_pre_signup
       * and badge_photo are all left alone: a resubmission must not hand out a
       * new confirmation link, undo an acceptance, or lose the badge photo.
       */
      const [saved] = await db
        .insert(hackathonSignups)
        .values({
          id: signupId,
          fullName,
          email,
          xUrl: emptyToNull(xUrl),
          linkedinUrl: emptyToNull(linkedinUrl),
          githubUrl: emptyToNull(githubUrl),
          webUrl: emptyToNull(webUrl),
          achievements: emptyToNull(achievements),
          freeTime: emptyToNull(freeTime),
          dietaryRestrictions,
          dietaryDetails: emptyToNull(dietaryDetails),
          dietaryConsentAt:
            hasDietaryData && dietaryDataConsent ? new Date() : null,
          occupationStatuses,
          studyInstitution: emptyToNull(studyInstitution),
          employer: emptyToNull(employer),
          cameFromPreSignup: relatedPreSignupId !== null,
          wantsAmbassador,
          ambassadorMotivation: motivationDb,
          heardFrom,
          referralCode: emptyToNull(
            referralCode || relatedPreSignupReferralCode || ""
          ),
        })
        .onConflictDoUpdate({
          target: hackathonSignups.email,
          set: {
            fullName,
            xUrl: emptyToNull(xUrl),
            linkedinUrl: emptyToNull(linkedinUrl),
            githubUrl: emptyToNull(githubUrl),
            webUrl: emptyToNull(webUrl),
            achievements: emptyToNull(achievements),
            freeTime: emptyToNull(freeTime),
            dietaryRestrictions,
            dietaryDetails: emptyToNull(dietaryDetails),
            dietaryConsentAt:
              hasDietaryData && dietaryDataConsent ? new Date() : null,
            occupationStatuses,
            studyInstitution: emptyToNull(studyInstitution),
            employer: emptyToNull(employer),
            wantsAmbassador,
            ambassadorMotivation: motivationDb,
            heardFrom,
            referralCode: emptyToNull(
              referralCode || relatedPreSignupReferralCode || ""
            ),
          },
        })
        .returning({ id: hackathonSignups.id });
      if (saved) {
        savedSignupId = saved.id;
      }
    } catch (e: unknown) {
      if (isPostgresUniqueViolation(e)) {
        return Response.json({ error: "duplicate_email" }, { status: 409 });
      }
      throw e;
    }
  } catch {
    console.error("[signup] Failed to save application");
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "save_failed");
        captureMessage("POST /api/signup: persistence failed", "error");
      });
    });
    await notifyDiscordSignupApiIssue({
      status: 500,
      error: "save_failed",
    });
    return Response.json({ error: "save_failed" }, { status: 500 });
  }

  if (relatedPreSignupId) {
    try {
      const db = getDb();
      await db
        .update(hackathonPreSignups)
        .set({ signupCompletedAt: new Date() })
        .where(eq(hackathonPreSignups.id, relatedPreSignupId));
    } catch {
      console.error("[signup] Failed to mark pre-signup as completed");
      safeSentry(() => {
        withScope((scope) => {
          scope.setTag("api", "signup");
          scope.setTag("outcome", "pre_signup_completion_mark_failed");
          captureMessage(
            "POST /api/signup: pre-signup completion update failed",
            "error"
          );
        });
      });
    }
  }

  // Row persisted — ancillary failures must not change the HTTP outcome.
  try {
    await notifyDiscordNewSignup({
      fullName,
      email,
      xUrl,
      linkedinUrl,
      githubUrl,
      webUrl,
      achievements,
      freeTime,
      occupationStatuses,
      studyInstitution,
      employer,
      cameFromPreSignup: relatedPreSignupId !== null,
      wantsAmbassador,
      ambassadorMotivation: wantsAmbassador ? ambassadorMotivation : "",
      heardFrom,
    });
  } catch {
    console.error("[signup] Discord notify failed after successful insert");
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "discord_notify_failed");
        captureMessage(
          "POST /api/signup: Discord notification failed",
          "warning"
        );
      });
    });
  }

  try {
    const emailResult = await sendSignupConfirmationEmail({
      fullName,
      email,
      signupId: savedSignupId,
      wantsAmbassador,
    });
    if (!emailResult.ok && emailResult.reason === "send_failed") {
      safeSentry(() => {
        withScope((scope) => {
          scope.setTag("api", "signup");
          scope.setTag("outcome", "confirmation_email_failed");
          captureMessage(
            "POST /api/signup: confirmation email failed",
            "warning"
          );
        });
      });
    }
  } catch {
    console.error("[signup] Confirmation email failed after successful insert");
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "confirmation_email_exception");
        captureMessage(
          "POST /api/signup: confirmation email failed",
          "warning"
        );
      });
    });
  }

  return Response.json({ ok: true });
};
