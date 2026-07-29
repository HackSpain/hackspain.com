import { captureException, captureMessage, withScope } from "@sentry/astro";
import type { APIRoute } from "astro";
import { checkBotId } from "botid/server";
import { randomUUID } from "node:crypto";
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

function emailHintFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return;
  }
  const e = (body as { email?: unknown }).email;
  return typeof e === "string" ? e.trim().slice(0, 320) : undefined;
}

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
      emailHint: emailHintFromBody(body),
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

  try {
    const db = getDb();
    try {
      await db.insert(hackathonPreSignups).values({
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
  } catch (e) {
    console.error(e);
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "pre-signup");
        scope.setTag("outcome", "save_failed");
        scope.setContext("error", { detail: errDetail(e) });
        captureException(e);
      });
    });
    await notifyDiscordSignupApiIssue({
      status: 500,
      error: "pre-signup:save_failed",
      detail: errDetail(e),
      emailHint: email,
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
  } catch (e) {
    console.error(
      "[pre-signup] Discord notify failed after successful insert:",
      e
    );
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "pre-signup");
        scope.setTag("outcome", "discord_notify_failed");
        captureException(e);
      });
    });
  }

  try {
    await start(handlePreSignupFollowup, [{ fullName, email }]);
  } catch (e) {
    console.error(
      "[pre-signup] Failed to start followup workflow after successful insert:",
      e
    );
    safeSentry(() => {
      withScope((scope) => {
        scope.setTag("api", "pre-signup");
        scope.setTag("outcome", "workflow_start_failed");
        captureException(e);
      });
    });
  }

  return Response.json({ ok: true });
};
