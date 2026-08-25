CREATE TYPE "public"."leave_type" AS ENUM('MC', 'PL', 'UL');--> statement-breakpoint
CREATE TABLE "leave_days" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"date" text NOT NULL,
	"type" "leave_type" NOT NULL,
	"half" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "leave_day_unique" ON "leave_days" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "leave_day_company_date_idx" ON "leave_days" USING btree ("company_id","date");