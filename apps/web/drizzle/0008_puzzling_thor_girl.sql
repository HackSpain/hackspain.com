ALTER TABLE "hackathon_signups" ALTER COLUMN "occupation_status" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "hackathon_signups" ALTER COLUMN "team_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "occupation_statuses" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "came_from_pre_signup" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD COLUMN "heard_from_sources" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
UPDATE "hackathon_signups" SET "occupation_statuses" = CASE WHEN "occupation_status" = '' OR "occupation_status" = 'other' THEN ARRAY[]::text[] ELSE ARRAY["occupation_status"] END;--> statement-breakpoint
UPDATE "hackathon_signups" SET "heard_from_sources" = CASE WHEN "heard_from" IS NULL OR "heard_from" = '' THEN ARRAY[]::text[] ELSE ARRAY["heard_from"] END;
