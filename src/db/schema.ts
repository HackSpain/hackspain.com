import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ShortlistDecision } from "../lib/shortlist-types";

type SignupApprovalStatus =
  | "accepted"
  | "cancelled"
  | "confirmed"
  | "pending"
  | "rejected"
  | "waitlist";

export const hackathonSignups = pgTable(
  "hackathon_signups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    xUrl: text("x_url"),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    webUrl: text("web_url"),
    achievements: text("achievements"),
    freeTime: text("free_time"),
    dietaryRestrictions: text("dietary_restrictions")
      .array()
      .default(sql`ARRAY[]::text[]`)
      .notNull(),
    dietaryDetails: text("dietary_details"),
    dietaryConsentAt: timestamp("dietary_consent_at", { withTimezone: true }),
    occupationStatuses: text("occupation_statuses")
      .array()
      .default(sql`ARRAY[]::text[]`)
      .notNull(),
    studyInstitution: text("study_institution"),
    employer: text("employer"),
    cameFromPreSignup: boolean("came_from_pre_signup").default(false).notNull(),
    wantsAmbassador: boolean("wants_ambassador").default(false).notNull(),
    ambassadorMotivation: text("ambassador_motivation"),
    heardFrom: text("heard_from_sources")
      .array()
      .default(sql`ARRAY[]::text[]`)
      .notNull(),
    referralCode: text("referral_code"),
    approvalStatus: text("approval_status")
      .$type<SignupApprovalStatus>()
      .default("pending")
      .notNull(),
    managementToken: uuid("management_token")
      .defaultRandom()
      .notNull()
      .unique(),
    cancellationEmailSentAt: timestamp("cancellation_email_sent_at", {
      withTimezone: true,
    }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    /**
     * The photo they chose for their badge, as a data URI, downscaled in the
     * browser before it is sent. Stored so the social image can print it: that
     * image is drawn on the server, which cannot see a photo living in a tab.
     */
    badgePhoto: text("badge_photo"),
    /** Doubles as the cache key for the social image. */
    badgePhotoUpdatedAt: timestamp("badge_photo_updated_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    check(
      "hackathon_signups_approval_status_check",
      sql`${table.approvalStatus} IN ('pending', 'rejected', 'accepted', 'confirmed', 'cancelled', 'waitlist')`
    ),
  ]
);

export const hackathonPreSignups = pgTable("hackathon_pre_signups", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  xUrl: text("x_url"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  webUrl: text("web_url"),
  referralCode: text("referral_code"),
  signupToken: uuid("signup_token").defaultRandom().notNull().unique(),
  cancellationToken: uuid("cancellation_token")
    .defaultRandom()
    .notNull()
    .unique(),
  signupCompletedAt: timestamp("signup_completed_at", {
    withTimezone: true,
  }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
});

export const shortlistReviews = pgTable(
  "shortlist_reviews",
  {
    signupId: uuid("signup_id")
      .primaryKey()
      .references(() => hackathonSignups.id, { onDelete: "cascade" }),
    decision: text("decision").$type<ShortlistDecision>(),
    score: integer("score"),
    notes: text("notes"),
    aiRecommendation: text("ai_recommendation").$type<ShortlistDecision>(),
    aiScore: integer("ai_score"),
    aiNote: text("ai_note"),
    aiEvidenceSources: text("ai_evidence_sources")
      .array()
      .default(sql`ARRAY[]::text[]`)
      .notNull(),
    aiReviewedAt: timestamp("ai_reviewed_at", { withTimezone: true }),
    aiRubricVersion: text("ai_rubric_version"),
    sourceNotes: text("source_notes"),
    sourceImportedAt: timestamp("source_imported_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "shortlist_reviews_decision_check",
      sql`${table.decision} IS NULL OR ${table.decision} IN ('yes', 'maybe', 'no')`
    ),
    check(
      "shortlist_reviews_score_check",
      sql`${table.score} IS NULL OR ${table.score} BETWEEN 1 AND 5`
    ),
    check(
      "shortlist_reviews_ai_recommendation_check",
      sql`${table.aiRecommendation} IS NULL OR ${table.aiRecommendation} IN ('yes', 'maybe', 'no')`
    ),
    check(
      "shortlist_reviews_ai_score_check",
      sql`${table.aiScore} IS NULL OR ${table.aiScore} BETWEEN 1 AND 5`
    ),
  ]
);

export type PlayerMarketProfileStatus = "draft" | "hidden" | "published";
export type PlayerMarketMagicLinkPurpose = "company_access" | "player_access";
export type PlayerMarketPrincipalType = "company" | "player";
export type PlayerMarketOfferStatus =
  | "accepted"
  | "expired"
  | "negotiating"
  | "rejected"
  | "sent";
export type PlayerMarketOfferEventType = PlayerMarketOfferStatus | "created";

export const playerMarketProfiles = pgTable(
  "player_market_profiles",
  {
    signupId: uuid("signup_id")
      .primaryKey()
      .references(() => hackathonSignups.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    displayName: text("display_name").notNull(),
    role: text("role"),
    city: text("city"),
    bio: text("bio"),
    lore: text("lore"),
    skills: text("skills").array().default(sql`ARRAY[]::text[]`).notNull(),
    sponsorshipTypes: text("sponsorship_types")
      .array()
      .default(sql`ARRAY[]::text[]`)
      .notNull(),
    status: text("status")
      .$type<PlayerMarketProfileStatus>()
      .default("draft")
      .notNull(),
    isAvailable: boolean("is_available").default(true).notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "player_market_profiles_status_check",
      sql`${table.status} IN ('draft', 'published', 'hidden')`
    ),
    check(
      "player_market_profiles_publish_consent_check",
      sql`${table.status} <> 'published' OR (${table.consentedAt} IS NOT NULL AND ${table.publishedAt} IS NOT NULL)`
    ),
  ]
);

export const playerMarketCompanies = pgTable("player_market_companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const playerMarketCompanyInvites = pgTable(
  "player_market_company_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    companyName: text("company_name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);

export const playerMarketMagicLinks = pgTable(
  "player_market_magic_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    purpose: text("purpose").$type<PlayerMarketMagicLinkPurpose>().notNull(),
    email: text("email").notNull(),
    companyName: text("company_name"),
    signupId: uuid("signup_id").references(() => hackathonSignups.id, {
      onDelete: "cascade",
    }),
    companyId: uuid("company_id").references(() => playerMarketCompanies.id, {
      onDelete: "cascade",
    }),
    tokenHash: text("token_hash").notNull().unique(),
    returnPath: text("return_path").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "player_market_magic_links_purpose_check",
      sql`${table.purpose} IN ('player_access', 'company_access')`
    ),
    check(
      "player_market_magic_links_owner_check",
      sql`(${table.purpose} = 'player_access' AND ${table.signupId} IS NOT NULL AND ${table.companyId} IS NULL) OR (${table.purpose} = 'company_access' AND ${table.signupId} IS NULL)`
    ),
  ]
);

export const playerMarketSessions = pgTable(
  "player_market_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    principalType: text("principal_type")
      .$type<PlayerMarketPrincipalType>()
      .notNull(),
    signupId: uuid("signup_id").references(() => hackathonSignups.id, {
      onDelete: "cascade",
    }),
    companyId: uuid("company_id").references(() => playerMarketCompanies.id, {
      onDelete: "cascade",
    }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "player_market_sessions_principal_check",
      sql`(${table.principalType} = 'player' AND ${table.signupId} IS NOT NULL AND ${table.companyId} IS NULL) OR (${table.principalType} = 'company' AND ${table.signupId} IS NULL AND ${table.companyId} IS NOT NULL)`
    ),
  ]
);

export const playerMarketOffers = pgTable(
  "player_market_offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileSignupId: uuid("profile_signup_id")
      .notNull()
      .references(() => playerMarketProfiles.signupId, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => playerMarketCompanies.id, { onDelete: "cascade" }),
    status: text("status").$type<PlayerMarketOfferStatus>().notNull(),
    sponsorshipType: text("sponsorship_type").notNull(),
    rewardTypes: text("reward_types")
      .array()
      .default(sql`ARRAY[]::text[]`)
      .notNull(),
    rewardSummary: text("reward_summary").notNull(),
    deliverables: text("deliverables").notNull(),
    message: text("message"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "player_market_offers_status_check",
      sql`${table.status} IN ('sent', 'negotiating', 'accepted', 'rejected', 'expired')`
    ),
    check(
      "player_market_offers_sponsorship_type_check",
      sql`${table.sponsorshipType} IN ('equipped', 'built_with', 'team_sponsor')`
    ),
  ]
);

export const playerMarketOfferEvents = pgTable(
  "player_market_offer_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => playerMarketOffers.id, { onDelete: "cascade" }),
    actorType: text("actor_type").notNull(),
    eventType: text("event_type").$type<PlayerMarketOfferEventType>().notNull(),
    details: jsonb("details").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "player_market_offer_events_actor_check",
      sql`${table.actorType} IN ('player', 'company', 'system')`
    ),
    check(
      "player_market_offer_events_type_check",
      sql`${table.eventType} IN ('created', 'sent', 'negotiating', 'accepted', 'rejected', 'expired')`
    ),
  ]
);
