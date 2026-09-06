const WHITESPACE_RE = /\s+/;

/** What still fits on the printed card before the type has nowhere left to go. */
const PRINTED_NAME_MAX_LENGTH = 40;
const ELLIPSIS = "…";

export interface BadgeName {
  firstName: string;
  lastName: string;
}

/**
 * Names are stored at whatever length the signup form allowed, which is far more
 * than a badge can print. The 3D card condenses the type to fit; a flat image
 * cannot, so it shortens the name instead.
 */
export function clampBadgeName(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length <= PRINTED_NAME_MAX_LENGTH) {
    return trimmed;
  }

  const head = trimmed.slice(0, PRINTED_NAME_MAX_LENGTH - 1);
  const lastSpace = head.lastIndexOf(" ");
  // Cutting mid-word reads as a typo on someone's own name, so it drops the
  // half word rather than keeping it — unless there is no word break to use.
  const kept = lastSpace > 0 ? head.slice(0, lastSpace) : head.trimEnd();
  return `${kept}${ELLIPSIS}`;
}

/**
 * The badge prints the name on two lines, so it needs splitting. Everything
 * after the first word goes on the second line, which keeps compound surnames
 * together the way a printed pass would.
 */
export function splitBadgeName(fullName: string): BadgeName {
  const parts = fullName.trim().split(WHITESPACE_RE).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Stands in for the portrait when there is no avatar to show. Built from the
 * first and last word, so "María del Carmen Villalonga" reads as MV rather than
 * picking up the particle in the middle.
 */
export function badgeInitials(fullName: string): string {
  const words = fullName.trim().split(WHITESPACE_RE).filter(Boolean);
  if (words.length === 0) {
    return "";
  }
  const first = words[0].charAt(0);
  const last = words.length > 1 ? (words.at(-1) as string).charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}
