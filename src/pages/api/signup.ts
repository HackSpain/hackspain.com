import { captureException, captureMessage, withScope } from "@sentry/astro";
import type { APIRoute } from "astro";
import { checkBotId } from "botid/server";
import { eq } from "drizzle-orm";
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

function emailHintFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return;
  }
  const e = (body as { email?: unknown }).email;
  return typeof e === "string" ? e.trim().slice(0, 320) : undefined;
}

/** Walk `Error.cause` (Drizzle wraps Neon here) so ops sees the real failure, not only "Failed query". */
function errDetail(e: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = e;
  for (let depth = 0; depth < 14 && cur != null; depth++) {
    if (seen.has(cur)) {
      break;
    }
    seen.add(cur);
    if (cur instanceof Error) {
      const line = `${cur.name}: ${cur.message}`.trim();
      if (line && parts.at(-1) !== line) {
        parts.push(line);
      }
      cur = cur.cause;
      continue;
    }
    if (typeof cur === "object") {
      const o = cur as Record<string, unknown>;
      if (typeof o.message === "string" && o.message.trim()) {
        const line = o.message.trim();
        if (parts.at(-1) !== line) {
          parts.push(line);
        }
      }
      if ("cause" in o && o.cause != null) {
        cur = o.cause;
        continue;
      }
      break;
    }
    parts.push(String(cur));
    break;
  }
  return parts.join("\n→\n").slice(0, 1024);
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
      emailHint: emailHintFromBody(body),
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
    occupationStatus,
    studyInstitution,
    employer,
    teamName,
    wantsAmbassador,
    ambassadorMotivation,
    ambassadorStudyWhere,
    heardFrom,
    referralCode,
    invitationToken,
  } = parsed.data;

  const motivationDb = wantsAmbassador
    ? emptyToNull(ambassadorMotivation)
    : null;
  const studyDb = wantsAmbassador ? emptyToNull(ambassadorStudyWhere) : null;

  let relatedPreSignupId: string | null = null;
  let relatedPreSignupReferralCode: string | null = null;

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
      await db.insert(hackathonSignups).values({
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
        occupationStatus,
        studyInstitution: emptyToNull(studyInstitution),
        employer: emptyToNull(employer),
        teamName,
        wantsAmbassador,
        ambassadorMotivation: motivationDb,
        ambassadorStudyWhere: studyDb,
        heardFrom: emptyToNull(heardFrom),
        referralCode: emptyToNull(
          referralCode || relatedPreSignupReferralCode || ""
        ),
      });
    } catch (e: unknown) {
      if (isPostgresUniqueViolation(e)) {
        return Response.json({ error: "duplicate_email" }, { status: 409 });
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "save_failed");
        scope.setContext("error", { detail: errDetail(e) });
        captureException(e);
      });
    });
    await notifyDiscordSignupApiIssue({
      status: 500,
      error: "save_failed",
      detail: errDetail(e),
      emailHint: email,
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
    } catch (e) {
      console.error("[signup] Failed to mark pre-signup as completed:", e);
      safeSentry(() => {
        withScope((scope) => {
          scope.setTag("api", "signup");
          scope.setTag("outcome", "pre_signup_completion_mark_failed");
          captureException(e);
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
      dietaryRestrictions,
      dietaryDetails,
      occupationStatus,
      studyInstitution,
      employer,
      teamName,
      wantsAmbassador,
      ambassadorMotivation: wantsAmbassador ? ambassadorMotivation : "",
      ambassadorStudyWhere: wantsAmbassador ? ambassadorStudyWhere : "",
      heardFrom,
    });
  } catch (e) {
    console.error("[signup] Discord notify failed after successful insert:", e);
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "discord_notify_failed");
        captureException(e);
      });
    });
  }

  try {
    const emailResult = await sendSignupConfirmationEmail({
      fullName,
      email,
      wantsAmbassador,
    });
    if (!emailResult.ok && emailResult.reason === "send_failed") {
      safeSentry(() => {
        withScope((scope) => {
          scope.setTag("api", "signup");
          scope.setTag("outcome", "confirmation_email_failed");
          scope.setContext("email", { detail: emailResult.detail });
          captureMessage(
            "POST /api/signup: confirmation email failed",
            "warning"
          );
        });
      });
    }
  } catch (e) {
    console.error(
      "[signup] Confirmation email threw after successful insert:",
      e
    );
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "signup");
        scope.setTag("outcome", "confirmation_email_exception");
        captureException(e);
      });
    });
  }

  return Response.json({ ok: true });
};
