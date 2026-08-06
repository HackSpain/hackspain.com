import {
  BADGE_PHOTO_MEDIA_TYPE,
  BADGE_PHOTO_QUALITY,
  BADGE_PHOTO_SIZE,
} from "../../lib/badge-photo";

/**
 * Redraws a chosen photo as a small square data URI: a centre crop, like the
 * portrait frame printed on the badge, at a size worth storing and sending. The
 * original never leaves the browser, only this reduction of it.
 */
export function badgePhotoDataUri(image: HTMLImageElement): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = BADGE_PHOTO_SIZE;
  canvas.height = BADGE_PHOTO_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (side === 0) {
    return null;
  }

  context.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    BADGE_PHOTO_SIZE,
    BADGE_PHOTO_SIZE
  );

  return canvas.toDataURL(BADGE_PHOTO_MEDIA_TYPE, BADGE_PHOTO_QUALITY);
}
