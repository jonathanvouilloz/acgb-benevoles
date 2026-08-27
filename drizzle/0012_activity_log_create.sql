CREATE TYPE "public"."activity_target" AS ENUM('tournament', 'position', 'shift', 'signup', 'volunteer');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"target_type" "activity_target" NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"actor_name" text NOT NULL,
	"actor_role" "user_role" NOT NULL,
	"volunteer_id" text,
	"volunteer_name" text,
	"detail" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_volunteer_id_user_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_tournament_created_idx" ON "activity_log" USING btree ("tournament_id","created_at" desc);--> statement-breakpoint
-- Reprise de l'historique de l'epic 14 : `assignment_log` ne traçait que des affectations, toutes
-- faites par un organisateur. `add`/`remove` deviennent `assign`/`unassign` (vocabulaire élargi).
INSERT INTO "activity_log" (
	"id", "tournament_id", "target_type", "action",
	"actor_id", "actor_name", "actor_role",
	"volunteer_id", "volunteer_name", "detail", "reason", "created_at"
)
SELECT
	"id", "tournament_id", 'signup'::"public"."activity_target",
	CASE "action"::text WHEN 'add' THEN 'assign' WHEN 'remove' THEN 'unassign' ELSE "action"::text END,
	"actor_id", "actor_name", 'organizer'::"public"."user_role",
	"volunteer_id", "volunteer_name", "detail", "reason", "created_at"
FROM "assignment_log";
