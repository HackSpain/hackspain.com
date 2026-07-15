ALTER TABLE "hackathon_signups" ADD COLUMN "approval_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "approval_email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" ADD COLUMN "signup_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" ADD COLUMN "signup_invite_queued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" ADD COLUMN "signup_invite_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" ADD COLUMN "signup_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" ADD CONSTRAINT "hackathon_pre_signups_signup_token_unique" UNIQUE("signup_token");--> statement-breakpoint
UPDATE "hackathon_pre_signups" AS "pre"
SET "signup_completed_at" = "signup"."created_at"
FROM "hackathon_signups" AS "signup"
WHERE lower("pre"."email") = lower("signup"."email")
  AND "pre"."signup_completed_at" IS NULL;
