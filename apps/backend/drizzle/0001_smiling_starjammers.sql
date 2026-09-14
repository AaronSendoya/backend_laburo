CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DROP INDEX "time_entries_updated_at_idx";--> statement-breakpoint
ALTER TABLE "sync_operation_log" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_operation_log" ADD CONSTRAINT "sync_operation_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_operation_log_user_idx" ON "sync_operation_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_updated_idx" ON "time_entries" USING btree ("user_id","updated_at");