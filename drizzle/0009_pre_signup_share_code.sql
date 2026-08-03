ALTER TABLE "hackathon_pre_signups" ADD COLUMN "share_code" text;--> statement-breakpoint
UPDATE "hackathon_pre_signups" SET "share_code" = CONCAT(COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(SPLIT_PART("email", '@', 1)), '[^a-z0-9]+', '-', 'g')), ''), 'hacker'), '-', SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12));--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" ALTER COLUMN "share_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" ADD CONSTRAINT "hackathon_pre_signups_share_code_unique" UNIQUE("share_code");
