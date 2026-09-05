CREATE TABLE "shortlist_reviews" (
	"signup_id" uuid PRIMARY KEY NOT NULL,
	"decision" text,
	"score" integer,
	"notes" text,
	"source_notes" text,
	"source_imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shortlist_reviews_decision_check" CHECK ("shortlist_reviews"."decision" IS NULL OR "shortlist_reviews"."decision" IN ('yes', 'maybe', 'no')),
	CONSTRAINT "shortlist_reviews_score_check" CHECK ("shortlist_reviews"."score" IS NULL OR "shortlist_reviews"."score" BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "shortlist_reviews" ADD CONSTRAINT "shortlist_reviews_signup_id_hackathon_signups_id_fk" FOREIGN KEY ("signup_id") REFERENCES "public"."hackathon_signups"("id") ON DELETE cascade ON UPDATE no action;