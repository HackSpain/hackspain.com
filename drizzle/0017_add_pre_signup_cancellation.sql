ALTER TABLE "hackathon_pre_signups" ADD COLUMN "cancellation_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" ADD CONSTRAINT "hackathon_pre_signups_cancellation_token_unique" UNIQUE("cancellation_token");