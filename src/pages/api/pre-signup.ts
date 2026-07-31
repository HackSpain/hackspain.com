import { randomUUID } from "node:crypto";
import { captureException, captureMessage, withScope } from "@sentry/astro";
import type { APIRoute } from "astro";
import { checkBotId } from "botid/server";
import { start } from "workflow/api";
import { getDb } from "../../db";
import { hackathonPreSignups } from "../../db/schema";
import {
  notifyDiscordNewPreSignup,
  notifyDiscordSignupApiIssue,
} from "../../lib/discord-signup-webhook";
import { parsePreSignupBody } from "../../lib/signup-validation";
import { handlePreSignupFollowup } from "../../workflows/pre-signup-followup";

export const prerender = false;

function safeSentry(report: () => void): void {
  try {
    report();
  } catch (e) {
    console.error("[pre-signup] Sentry reporting failed:", e);
  }
}

function emptyToNull(s: string): string | null {
  return s.length === 0 ? null : s;
}

function shareCodeFromEmail(email: string): string {
  const localPart = email.split("@", 1)[0] ?? "";
  const slug = localPart
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  return `${slug || "hacker"}-${suffix}`;
}

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
  if (!import.meta.env.DEV) {
    try {
      const verification = await checkBotId();
      if (verification.isBot) {
        safeSentry(() => {
          withScope((scope) => {
            scope.setTag("api", "pre-signup");
            scope.setTag("outcome", "access_denied");
            captureMessage("POST /api/pre-signup blocked (BotID)", "warning");
          });
        });
        return Response.json({ error: "access_denied" }, { status: 403 });
      }
    } catch (e) {
      safeSentry(() => {
        withScope((scope) => {
          scope.setTag("api", "pre-signup");
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
    return Response.json({ error: "expected_json" }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = parsePreSignupBody(body);
  if (!parsed.ok) {
    await notifyDiscordSignupApiIssue({
      status: 400,
      error: `pre-signup:${parsed.error}`,
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
    referralCode,
  } = parsed.data;
  const preSignupId = crypto.randomUUID();

  try {
    const db = getDb();
    try {
      await db.insert(hackathonPreSignups).values({
        id: preSignupId,
        fullName,
        email,
        xUrl: emptyToNull(xUrl),
        linkedinUrl: emptyToNull(linkedinUrl),
        githubUrl: emptyToNull(githubUrl),
        webUrl: emptyToNull(webUrl),
        referralCode: emptyToNull(referralCode),
        shareCode: shareCodeFromEmail(email),
      });
    } catch (e: unknown) {
      if (isPostgresUniqueViolation(e)) {
        return Response.json({ error: "duplicate_email" }, { status: 409 });
      }
      throw e;
    }
  } catch {
    console.error("[pre-signup] Failed to save pre-signup");
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "pre-signup");
        scope.setTag("outcome", "save_failed");
        captureMessage("POST /api/pre-signup: persistence failed", "error");
      });
    });
    await notifyDiscordSignupApiIssue({
      status: 500,
      error: "pre-signup:save_failed",
    });
    return Response.json({ error: "save_failed" }, { status: 500 });
  }

  // Row persisted — ancillary failures must not change the HTTP outcome.
  try {
    await notifyDiscordNewPreSignup({
      fullName,
      email,
      xUrl,
      linkedinUrl,
      githubUrl,
      webUrl,
    });
  } catch {
    console.error("[pre-signup] Discord notify failed after successful insert");
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "pre-signup");
        scope.setTag("outcome", "discord_notify_failed");
        captureMessage(
          "POST /api/pre-signup: Discord notification failed",
          "warning"
        );
      });
    });
  }

  try {
    await start(handlePreSignupFollowup, [{ fullName, email, preSignupId }]);
  } catch {
    console.error(
      "[pre-signup] Failed to start followup workflow after successful insert"
    );
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "pre-signup");
        scope.setTag("outcome", "workflow_start_failed");
        captureMessage(
          "POST /api/pre-signup: followup workflow failed",
          "warning"
        );
      });
    });
  }

  return Response.json({ ok: true });
};
