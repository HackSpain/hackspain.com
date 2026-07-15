import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { hackathonPreSignups, hackathonSignups } from "../../db/schema";

export const prerender = false;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim() !==
    "application/json"
  ) {
    return json({ error: "expected_json" }, 415);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const token =
    body && typeof body === "object" && "token" in body
      ? (body as { token?: unknown }).token
      : null;
  if (typeof token !== "string" || !UUID_RE.test(token)) {
    return json({ error: "invalid_invitation" }, 400);
  }

  const db = getDb();
  const [preSignup] = await db
    .select({
      email: hackathonPreSignups.email,
      fullName: hackathonPreSignups.fullName,
      githubUrl: hackathonPreSignups.githubUrl,
      linkedinUrl: hackathonPreSignups.linkedinUrl,
      signupCompletedAt: hackathonPreSignups.signupCompletedAt,
      webUrl: hackathonPreSignups.webUrl,
      xUrl: hackathonPreSignups.xUrl,
    })
    .from(hackathonPreSignups)
    .where(eq(hackathonPreSignups.signupToken, token))
    .limit(1);

  if (!preSignup) {
    return json({ error: "invalid_invitation" }, 404);
  }
  if (preSignup.signupCompletedAt) {
    return json({ error: "invitation_used" }, 410);
  }

  const [existingSignup] = await db
    .select({ id: hackathonSignups.id })
    .from(hackathonSignups)
    .where(eq(hackathonSignups.email, preSignup.email))
    .limit(1);
  if (existingSignup) {
    return json({ error: "invitation_used" }, 410);
  }

  return json({
    data: {
      email: preSignup.email,
      fullName: preSignup.fullName,
      githubUrl: preSignup.githubUrl ?? "",
      linkedinUrl: preSignup.linkedinUrl ?? "",
      webUrl: preSignup.webUrl ?? "",
      xUrl: preSignup.xUrl ?? "",
    },
  });
};
