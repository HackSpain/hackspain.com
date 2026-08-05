import type { APIRoute } from "astro";
import { isGithubHandle } from "../../lib/github-handle";

export const prerender = false;

const AVATAR_SIZE = 460;
const UPSTREAM_TIMEOUT_MS = 4000;
/** Avatars change rarely, and the badge is redrawn on every visit. */
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, immutable";

/**
 * Proxies github.com/<handle>.png through our own origin. Drawing the avatar
 * straight from GitHub is not an option: that URL answers with a redirect that
 * carries no CORS headers, so the browser refuses the cross-origin image and
 * the badge canvas cannot use it at all.
 */
export const GET: APIRoute = async ({ url }) => {
  const handle = url.searchParams.get("user")?.trim() ?? "";

  if (!(handle && isGithubHandle(handle))) {
    return new Response("Invalid handle", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://github.com/${handle}.png?size=${AVATAR_SIZE}`,
      {
        headers: { accept: "image/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }
    );
  } catch {
    return new Response("Avatar unavailable", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!(upstream.ok && contentType.startsWith("image/"))) {
    return new Response("Avatar not found", { status: 404 });
  }

  return new Response(upstream.body, {
    headers: {
      "cache-control": CACHE_CONTROL,
      "content-type": contentType,
    },
    status: 200,
  });
};
