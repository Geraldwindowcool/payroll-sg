CREATE TYPE "public"."budget_category_type" AS ENUM('INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TABLE "budget_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "budget_category_type" NOT NULL,
	"monthly_target" numeric(10, 2),
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"category_id" text NOT NULL,
	"ym" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "budget_categories_company_idx" ON "budget_categories" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "budget_entries_company_ym_idx" ON "budget_entries" USING btree ("company_id","ym");--> statement-breakpoint
CREATE INDEX "budget_entries_category_idx" ON "budget_entries" USING btree ("category_id");