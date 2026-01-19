CREATE TABLE "filter_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"expression" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_times" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"date_time" timestamp NOT NULL,
	"end_date_time" timestamp,
	"attended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"website_url" text,
	"address" text NOT NULL,
	"status" text DEFAULT 'saved' NOT NULL,
	"property_type" text,
	"price" integer,
	"bedrooms" integer DEFAULT 1,
	"bathrooms" integer DEFAULT 1,
	"square_metres" integer,
	"age_years" integer,
	"previous_price" integer,
	"car_park_included" boolean,
	"car_park_cost" integer,
	"body_corp_fees" integer,
	"council_rates" integer,
	"estimated_rent" integer,
	"pets_allowed" boolean,
	"storage_included" boolean,
	"aspect" text,
	"agent_name" text,
	"agent_contact" text,
	"date_listed" date,
	"notes" text,
	"desks_fit" integer,
	"has_laundry_space" boolean,
	"floor_level" integer,
	"good_lighting" boolean,
	"has_dishwasher" boolean,
	"stove_type" text,
	"is_quiet" boolean,
	"has_aircon" boolean,
	"overall_impression" integer,
	"visible_issues" text,
	"post_inspection_notes" text,
	"distance_to_work" real,
	"nearest_station" jsonb,
	"nearest_supermarket" jsonb,
	"nearest_gym" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rateLimits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rateLimits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inspection_times" ADD CONSTRAINT "inspection_times_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;