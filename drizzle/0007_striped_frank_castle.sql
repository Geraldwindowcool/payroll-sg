CREATE TYPE "public"."budget_entry_source" AS ENUM('MANUAL', 'XERO');--> statement-breakpoint
CREATE TABLE "xero_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"tenant_name" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_entries" ADD COLUMN "source" "budget_entry_source" DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "xero_connections_company_unique" ON "xero_connections" USING btree ("company_id");