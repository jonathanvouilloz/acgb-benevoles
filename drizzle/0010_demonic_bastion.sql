CREATE TYPE "public"."assignment_action" AS ENUM('add', 'remove', 'move', 'swap');--> statement-breakpoint
CREATE TABLE "assignment_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"action" "assignment_action" NOT NULL,
	"actor_id" text,
	"actor_name" text NOT NULL,
	"volunteer_id" text,
	"volunteer_name" text NOT NULL,
	"detail" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_placeholder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_log" ADD CONSTRAINT "assignment_log_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_log" ADD CONSTRAINT "assignment_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_log" ADD CONSTRAINT "assignment_log_volunteer_id_user_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;