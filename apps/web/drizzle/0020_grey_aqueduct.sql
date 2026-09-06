ALTER TABLE "shortlist_reviews" ADD COLUMN "ai_recommendation" text;--> statement-breakpoint
ALTER TABLE "shortlist_reviews" ADD COLUMN "ai_score" integer;--> statement-breakpoint
ALTER TABLE "shortlist_reviews" ADD COLUMN "ai_note" text;--> statement-breakpoint
ALTER TABLE "shortlist_reviews" ADD COLUMN "ai_evidence_sources" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "shortlist_reviews" ADD COLUMN "ai_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shortlist_reviews" ADD COLUMN "ai_rubric_version" text;--> statement-breakpoint
ALTER TABLE "shortlist_reviews" ADD CONSTRAINT "shortlist_reviews_ai_recommendation_check" CHECK ("shortlist_reviews"."ai_recommendation" IS NULL OR "shortlist_reviews"."ai_recommendation" IN ('yes', 'maybe', 'no'));--> statement-breakpoint
ALTER TABLE "shortlist_reviews" ADD CONSTRAINT "shortlist_reviews_ai_score_check" CHECK ("shortlist_reviews"."ai_score" IS NULL OR "shortlist_reviews"."ai_score" BETWEEN 1 AND 5);