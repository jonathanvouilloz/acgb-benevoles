CREATE TABLE "signup_digest" (
	"user_id" text NOT NULL,
	"tournament_id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"sent_revision" integer,
	"by_organizer" boolean DEFAULT false NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	CONSTRAINT "signup_digest_user_id_tournament_id_pk" PRIMARY KEY("user_id","tournament_id")
);
--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "signup_digest" ADD CONSTRAINT "signup_digest_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_digest" ADD CONSTRAINT "signup_digest_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;