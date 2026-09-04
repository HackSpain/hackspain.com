CREATE TABLE "hackathon_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"x_url" text,
	"linkedin_url" text,
	"github_url" text,
	"web_url" text,
	"achievements" text,
	"free_time" text,
	CONSTRAINT "hackathon_signups_email_unique" UNIQUE("email")
);
