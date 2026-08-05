ALTER TABLE "hackathon_signups" RENAME COLUMN "cancellation_token" TO "management_token";--> statement-breakpoint
ALTER TABLE "hackathon_signups" DROP CONSTRAINT "hackathon_signups_cancellation_token_unique";--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD CONSTRAINT "hackathon_signups_management_token_unique" UNIQUE("management_token");