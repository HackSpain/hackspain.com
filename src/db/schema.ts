import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

type SignupApprovalStatus = "approved" | "pending" | "rejected";

export const hackathonSignups = pgTable("hackathon_signups", {
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
  occupationStatus: text("occupation_status").notNull(),
  studyInstitution: text("study_institution"),
  employer: text("employer"),
  teamName: text("team_name").notNull(),
  wantsAmbassador: boolean("wants_ambassador").default(false).notNull(),
  ambassadorMotivation: text("ambassador_motivation"),
  ambassadorStudyWhere: text("ambassador_study_where"),
  heardFrom: text("heard_from"),
  referralCode: text("referral_code"),
  approvalStatus: text("approval_status")
    .$type<SignupApprovalStatus>()
    .default("pending")
    .notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  approvalEmailSentAt: timestamp("approval_email_sent_at", {
    withTimezone: true,
  }),
});

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
  signupInviteQueuedAt: timestamp("signup_invite_queued_at", {
    withTimezone: true,
  }),
  signupInviteSentAt: timestamp("signup_invite_sent_at", {
    withTimezone: true,
  }),
  signupCompletedAt: timestamp("signup_completed_at", {
    withTimezone: true,
  }),
});

export const ambassadorApplications = pgTable("ambassador_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  institution: text("institution").notNull(),
  cityRegion: text("city_region").notNull(),
  xUrl: text("x_url"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  webUrl: text("web_url"),
  motivation: text("motivation").notNull(),
  outreachPlan: text("outreach_plan").notNull(),
});
