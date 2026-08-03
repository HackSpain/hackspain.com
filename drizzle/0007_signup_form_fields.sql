ALTER TABLE "hackathon_signups" ADD COLUMN "dietary_restrictions" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "dietary_details" text;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "occupation_status" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ALTER COLUMN "occupation_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "study_institution" text;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "employer" text;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "team_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ALTER COLUMN "team_name" DROP DEFAULT;
