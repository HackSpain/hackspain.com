import { z } from "zod";

const PLAYER_MARKET_SPONSORSHIP_TYPES = [
  "equipped",
  "built_with",
  "team_sponsor",
] as const;

const PLAYER_MARKET_REWARD_TYPES = [
  "money",
  "credits",
  "hardware",
  "merch",
  "food",
  "custom",
] as const;

export const playerMarketAccessRequestSchema = z.discriminatedUnion(
  "audience",
  [
    z.object({
      audience: z.literal("player"),
      email: z
        .email()
        .max(320)
        .transform((value) => value.toLowerCase()),
      returnTo: z.string().max(300).optional(),
    }),
    z.object({
      audience: z.literal("company"),
      companyName: z.string().trim().min(2).max(100),
      email: z
        .email()
        .max(320)
        .transform((value) => value.toLowerCase()),
      inviteToken: z.string().trim().max(200).optional(),
      returnTo: z.string().max(300).optional(),
    }),
  ]
);

export const playerMarketProfileUpdateSchema = z.object({
  bio: z.string().trim().max(360),
  city: z.string().trim().min(2).max(80),
  displayName: z.string().trim().min(2).max(80),
  isAvailable: z.boolean(),
  lore: z.string().trim().min(10).max(260),
  publish: z.boolean(),
  role: z.string().trim().min(2).max(80),
  skills: z
    .array(z.string().trim().min(1).max(32))
    .min(1)
    .max(6)
    .transform((values) => [
      ...new Set(values.map((value) => value.toUpperCase())),
    ]),
  sponsorshipTypes: z
    .array(z.enum(PLAYER_MARKET_SPONSORSHIP_TYPES))
    .min(1)
    .max(3),
});

export const playerMarketOfferCreateSchema = z.object({
  deliverables: z.string().trim().min(10).max(700),
  message: z.string().trim().max(1000).optional(),
  profileSlug: z.string().trim().min(1).max(120),
  rewardSummary: z.string().trim().min(2).max(180),
  rewardTypes: z.array(z.enum(PLAYER_MARKET_REWARD_TYPES)).min(1).max(4),
  sponsorshipType: z.enum(PLAYER_MARKET_SPONSORSHIP_TYPES),
});

export const playerMarketOfferDecisionSchema = z
  .object({
    action: z.enum(["accept", "negotiate", "reject"]),
    deliverables: z.string().trim().max(700).optional(),
    note: z.string().trim().max(700).optional(),
    rewardSummary: z.string().trim().max(180).optional(),
  })
  .refine(
    (value) =>
      value.action !== "negotiate" ||
      Boolean(value.note || value.deliverables || value.rewardSummary),
    { message: "negotiation_requires_changes" }
  );

export type PlayerMarketProfileUpdate = z.infer<
  typeof playerMarketProfileUpdateSchema
>;
export type PlayerMarketOfferCreate = z.infer<
  typeof playerMarketOfferCreateSchema
>;
export type PlayerMarketOfferDecision = z.infer<
  typeof playerMarketOfferDecisionSchema
>;

export interface PublicPlayerMarketProfile {
  bio: string | null;
  city: string;
  displayName: string;
  initials: string;
  isAvailable: boolean;
  lore: string;
  photo: string | null;
  role: string;
  skills: string[];
  slug: string;
  sponsorshipTypes: string[];
}

export interface PublicPlayerMarketTransfer {
  acceptedAt: string;
  companyName: string;
  id: string;
  playerName: string;
  rewardSummary: string;
  sponsorshipType: string;
}

export type PlayerMarketSessionPrincipal =
  | { companyId: string; signupId: null; type: "company" }
  | { companyId: null; signupId: string; type: "player" };
