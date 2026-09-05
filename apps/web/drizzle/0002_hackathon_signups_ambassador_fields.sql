ALTER TABLE "hackathon_signups" ADD COLUMN "wants_ambassador" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "ambassador_motivation" text;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "ambassador_study_where" text;