import type { APIRoute } from "astro";
import { fetchGithubAvatar } from "../../lib/github-avatar";

export const prerender = false;

/** Avatars change rarely, and the badge is redrawn on every visit. */
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, immutable";

const STATUS_RESPONSES = {
  invalid_handle: { body: "Invalid handle", status: 400 },
  not_found: { body: "Avatar not found", status: 404 },
  unavailable: { body: "Avatar unavailable", status: 502 },
} as const;

/**
 * Proxies the avatar through our own origin so the badge canvas can use it:
 * drawing it straight from GitHub is not an option, because that URL answers
 * with a redirect that carries no CORS headers.
 */
export const GET: APIRoute = async ({ url }) => {
  const handle = url.searchParams.get("user")?.trim() ?? "";
  const result = await fetchGithubAvatar(handle);

  if (result.status !== "ok") {
    const { body, status } = STATUS_RESPONSES[result.status];
    return new Response(body, { status });
  }

  return new Response(result.response.body, {
    headers: {
      "cache-control": CACHE_CONTROL,
      "content-type": result.contentType,
    },
    status: 200,
  });
};
