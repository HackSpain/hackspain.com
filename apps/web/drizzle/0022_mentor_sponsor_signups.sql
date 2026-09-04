CREATE TABLE "mentor_sponsor_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"company" text NOT NULL,
	"role" text,
	"attendance_slots" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"dietary_restrictions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"dietary_details" text,
	"dietary_consent_at" timestamp with time zone,
	"notes" text,
	"management_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	CONSTRAINT "mentor_sponsor_signups_email_unique" UNIQUE("email"),
	CONSTRAINT "mentor_sponsor_signups_management_token_unique" UNIQUE("management_token"),
	CONSTRAINT "mentor_sponsor_signups_role_check" CHECK ("mentor_sponsor_signups"."role" IS NULL OR "mentor_sponsor_signups"."role" IN ('mentor', 'sponsor')),
	CONSTRAINT "mentor_sponsor_signups_attendance_slots_check" CHECK ("mentor_sponsor_signups"."attendance_slots" <@ ARRAY['fri_morning', 'fri_lunch', 'fri_afternoon', 'fri_dinner', 'sat_morning', 'sat_lunch', 'sat_afternoon', 'sat_dinner', 'sun_morning', 'sun_lunch', 'sun_afternoon', 'sun_dinner']::text[])
);
