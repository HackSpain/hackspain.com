UPDATE "hackathon_signups"
SET "approval_status" = 'accepted'
WHERE "approval_status" = 'approved';--> statement-breakpoint
UPDATE "hackathon_signups"
SET "cancelled_at" = COALESCE("cancelled_at", NOW())
WHERE "approval_status" = 'cancelled';--> statement-breakpoint
ALTER TABLE "hackathon_signups" ADD CONSTRAINT "hackathon_signups_approval_status_check" CHECK ("hackathon_signups"."approval_status" IN ('pending', 'rejected', 'accepted', 'confirmed', 'cancelled'));
