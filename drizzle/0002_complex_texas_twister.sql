ALTER TABLE "signup" ADD COLUMN "reminder_24_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "signup" ADD COLUMN "reminder_2_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint");