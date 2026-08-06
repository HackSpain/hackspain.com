/**
 * The badge photo travels and is stored as a data URI, so it can be printed into
 * the social image without a round trip to storage. The browser downscales it
 * first; these limits are the server's own check on what arrives.
 */
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DATA_URI_RE = /^data:([a-z]+\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/;

/** Comfortably above a 400px square JPEG, far below anything worth storing. */
export const BADGE_PHOTO_MAX_LENGTH = 300_000;

/** Square, and small enough that the base64 stays well inside the limit. */
export const BADGE_PHOTO_SIZE = 400;
export const BADGE_PHOTO_MEDIA_TYPE = "image/jpeg";
export const BADGE_PHOTO_QUALITY = 0.82;

export function isValidBadgePhoto(value: unknown): value is string {
  if (typeof value !== "string" || value.length > BADGE_PHOTO_MAX_LENGTH) {
    return false;
  }

  const match = DATA_URI_RE.exec(value);
  if (!match) {
    return false;
  }

  return ALLOWED_MEDIA_TYPES.has(match[1]);
}
