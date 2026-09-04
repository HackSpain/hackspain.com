CREATE TABLE "ambassador_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"institution" text NOT NULL,
	"city_region" text NOT NULL,
	"x_url" text,
	"linkedin_url" text,
	"github_url" text,
	"web_url" text,
	"motivation" text NOT NULL,
	"outreach_plan" text NOT NULL,
	CONSTRAINT "ambassador_applications_email_unique" UNIQUE("email")
);
