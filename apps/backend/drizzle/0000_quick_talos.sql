CREATE TABLE "sync_operation_log" (
	"op_id" uuid PRIMARY KEY NOT NULL,
	"entity_id" uuid NOT NULL,
	"op_type" varchar(10) NOT NULL,
	"applied_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"check_in" timestamp (3) with time zone NOT NULL,
	"check_out" timestamp (3) with time zone,
	"note" varchar(500),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"client_updated_at" timestamp (3) with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "time_entries_updated_at_idx" ON "time_entries" USING btree ("updated_at");