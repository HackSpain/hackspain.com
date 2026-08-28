CREATE TABLE "player_market_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_market_companies_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "player_market_company_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"company_name" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_market_company_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "player_market_magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" text NOT NULL,
	"email" text NOT NULL,
	"company_name" text,
	"signup_id" uuid,
	"company_id" uuid,
	"token_hash" text NOT NULL,
	"return_path" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_market_magic_links_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "player_market_magic_links_purpose_check" CHECK ("player_market_magic_links"."purpose" IN ('player_access', 'company_access')),
	CONSTRAINT "player_market_magic_links_owner_check" CHECK (("player_market_magic_links"."purpose" = 'player_access' AND "player_market_magic_links"."signup_id" IS NOT NULL AND "player_market_magic_links"."company_id" IS NULL) OR ("player_market_magic_links"."purpose" = 'company_access' AND "player_market_magic_links"."signup_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "player_market_offer_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"actor_type" text NOT NULL,
	"event_type" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_market_offer_events_actor_check" CHECK ("player_market_offer_events"."actor_type" IN ('player', 'company', 'system')),
	CONSTRAINT "player_market_offer_events_type_check" CHECK ("player_market_offer_events"."event_type" IN ('created', 'sent', 'negotiating', 'accepted', 'rejected', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "player_market_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_signup_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"status" text NOT NULL,
	"sponsorship_type" text NOT NULL,
	"reward_types" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"reward_summary" text NOT NULL,
	"deliverables" text NOT NULL,
	"message" text,
	"expires_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_market_offers_status_check" CHECK ("player_market_offers"."status" IN ('sent', 'negotiating', 'accepted', 'rejected', 'expired')),
	CONSTRAINT "player_market_offers_sponsorship_type_check" CHECK ("player_market_offers"."sponsorship_type" IN ('equipped', 'built_with', 'team_sponsor'))
);
--> statement-breakpoint
CREATE TABLE "player_market_profiles" (
	"signup_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text,
	"city" text,
	"bio" text,
	"lore" text,
	"skills" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"sponsorship_types" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"consented_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_market_profiles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "player_market_profiles_status_check" CHECK ("player_market_profiles"."status" IN ('draft', 'published', 'hidden')),
	CONSTRAINT "player_market_profiles_publish_consent_check" CHECK ("player_market_profiles"."status" <> 'published' OR ("player_market_profiles"."consented_at" IS NOT NULL AND "player_market_profiles"."published_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "player_market_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"principal_type" text NOT NULL,
	"signup_id" uuid,
	"company_id" uuid,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_market_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "player_market_sessions_principal_check" CHECK (("player_market_sessions"."principal_type" = 'player' AND "player_market_sessions"."signup_id" IS NOT NULL AND "player_market_sessions"."company_id" IS NULL) OR ("player_market_sessions"."principal_type" = 'company' AND "player_market_sessions"."signup_id" IS NULL AND "player_market_sessions"."company_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "player_market_magic_links" ADD CONSTRAINT "player_market_magic_links_signup_id_hackathon_signups_id_fk" FOREIGN KEY ("signup_id") REFERENCES "public"."hackathon_signups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_market_magic_links" ADD CONSTRAINT "player_market_magic_links_company_id_player_market_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."player_market_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_market_offer_events" ADD CONSTRAINT "player_market_offer_events_offer_id_player_market_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."player_market_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_market_offers" ADD CONSTRAINT "player_market_offers_profile_signup_id_player_market_profiles_signup_id_fk" FOREIGN KEY ("profile_signup_id") REFERENCES "public"."player_market_profiles"("signup_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_market_offers" ADD CONSTRAINT "player_market_offers_company_id_player_market_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."player_market_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_market_profiles" ADD CONSTRAINT "player_market_profiles_signup_id_hackathon_signups_id_fk" FOREIGN KEY ("signup_id") REFERENCES "public"."hackathon_signups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_market_sessions" ADD CONSTRAINT "player_market_sessions_signup_id_hackathon_signups_id_fk" FOREIGN KEY ("signup_id") REFERENCES "public"."hackathon_signups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_market_sessions" ADD CONSTRAINT "player_market_sessions_company_id_player_market_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."player_market_companies"("id") ON DELETE cascade ON UPDATE no action;