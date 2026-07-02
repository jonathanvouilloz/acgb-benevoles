CREATE TYPE "public"."organizer_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('volunteer', 'organizer', 'super_admin');--> statement-breakpoint
CREATE TABLE "organizer_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "organizer_request_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "user_role" DEFAULT 'volunteer' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizer_request" ADD CONSTRAINT "organizer_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_request" ADD CONSTRAINT "organizer_request_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Migration data : préserver les organisateurs existants (booléen → enum) avant le drop (0006).
UPDATE "user" SET "role" = 'organizer' WHERE "is_organizer" = true;