import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

type SignupApprovalStatus =
  | "accepted"
  | "cancelled"
  | "confirmed"
  | "pending"
  | "rejected";

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
      sql`${table.approvalStatus} IN ('pending', 'rejected', 'accepted', 'confirmed', 'cancelled')`
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
