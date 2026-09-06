DROP TABLE "ambassador_applications";--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" DROP COLUMN "signup_invite_queued_at";--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" DROP COLUMN "signup_invite_sent_at";--> statement-breakpoint
ALTER TABLE "hackathon_pre_signups" DROP COLUMN "signup_reminder_sent_at";--> statement-breakpoint
ALTER TABLE "hackathon_signups" DROP COLUMN "occupation_status";--> statement-breakpoint
ALTER TABLE "hackathon_signups" DROP COLUMN "team_name";--> statement-breakpoint
ALTER TABLE "hackathon_signups" DROP COLUMN "ambassador_study_where";--> statement-breakpoint
ALTER TABLE "hackathon_signups" DROP COLUMN "heard_from";--> statement-breakpoint
ALTER TABLE "hackathon_signups" DROP COLUMN "reviewed_at";--> statement-breakpoint
ALTER TABLE "hackathon_signups" DROP COLUMN "approval_email_sent_at";
