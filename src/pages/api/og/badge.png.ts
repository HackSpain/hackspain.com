import { ImageResponse } from "@vercel/og";
import type { APIRoute } from "astro";
import { OgBadge } from "../../../components/share/og-badge";
import { ogBadgeFonts } from "../../../components/share/og-badge-fonts";
import {
  badgeShareParamsFrom,
  OG_BADGE_HEIGHT,
  OG_BADGE_WIDTH,
} from "../../../lib/badge-share-params";
import { findSharedBadge } from "../../../lib/badge-signup-lookup";
import { fetchGithubAvatar } from "../../../lib/github-avatar";

export const prerender = false;

/**
 * Crawlers refetch these constantly, and the result only changes when the query
 * string does, so the CDN can hold onto it for a long time.
 */
const CACHE_CONTROL = "public, max-age=3600, s-maxage=604800";

/** The renderer has no network access, so the avatar travels inline. */
async function avatarDataUri(handle: string | null): Promise<string | null> {
  if (!handle) {
    return null;
  }

  const result = await fetchGithubAvatar(handle);
  if (result.status !== "ok") {
    return null;
  }

  const bytes = Buffer.from(await result.response.arrayBuffer());
  return `data:${result.contentType};base64,${bytes.toString("base64")}`;
}

/**
 * A photo they put on the badge themselves wins over the GitHub avatar: it is
 * the more deliberate choice, and it is what they saw when they shared.
 */
function badgePortrait(
  photoDataUri: string | null,
  githubHandle: string | null
): Promise<string | null> {
  return photoDataUri
    ? Promise.resolve(photoDataUri)
    : avatarDataUri(githubHandle);
}

/**
 * The link preview for `/comparte`: the attendee's own badge, drawn per request.
 * It resolves the same record the page does, so an invented query string cannot
 * mint a badge image on our own domain.
 */
export const GET: APIRoute = async ({ url }) => {
  const badge = await findSharedBadge(badgeShareParamsFrom(url.searchParams));

  if (!badge) {
    return new Response("No matching signup", { status: 404 });
  }

  const { fullName, githubHandle, photoDataUri } = badge;

  return new ImageResponse(
    OgBadge({
      avatarDataUri: await badgePortrait(photoDataUri, githubHandle),
      fullName,
    }),
    {
      fonts: ogBadgeFonts(),
      headers: { "cache-control": CACHE_CONTROL },
      height: OG_BADGE_HEIGHT,
      width: OG_BADGE_WIDTH,
    }
  );
};
