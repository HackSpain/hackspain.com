export type BadgeRoleId = "hacker" | "mentor" | "sponsor";

export interface BadgeRole {
  background: string;
  clip: string;
  id: BadgeRoleId;
  label: string;
  nameText: string;
  stripe: string;
  stripeText: string;
}

export const BADGE_ROLES: readonly BadgeRole[] = [
  {
    id: "hacker",
    label: "HACKER",
    background: "#d96b2a",
    stripe: "#0f0d0c",
    stripeText: "#f4ecd8",
    nameText: "#ffffff",
    clip: "#f4ecd8",
  },
  {
    id: "mentor",
    label: "MENTOR",
    background: "#f4ecd8",
    stripe: "#d96b2a",
    stripeText: "#ffffff",
    nameText: "#2a170f",
    clip: "#d96b2a",
  },
  {
    id: "sponsor",
    label: "SPONSOR",
    background: "#35858a",
    stripe: "#eab619",
    stripeText: "#ffffff",
    nameText: "#ffffff",
    clip: "#eab619",
  },
] as const;

export function badgeRoleById(id: string | null | undefined): BadgeRole {
  return BADGE_ROLES.find((role) => role.id === id) ?? BADGE_ROLES[0];
}
