/**
 * Every attendee badge is a hacker badge, so the palette is a single constant
 * rather than a lookup — nothing downstream needs to branch on role.
 */
export const BADGE_PALETTE = {
  background: "#d96b2a",
  clip: "#f4ecd8",
  label: "HACKER",
  nameText: "#ffffff",
  stripe: "#0f0d0c",
  stripeText: "#f4ecd8",
} as const;
