CREATE TYPE "public"."payroll_cash_adjustment_reason" AS ENUM('DEFERRED_DRAW', 'UNPAID_LEAVE_CPF', 'COST_SHARE', 'OTHER');--> statement-breakpoint
CREATE TABLE "payroll_cash_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"employee_id" text,
	"ym" text NOT NULL,
	"reason" "payroll_cash_adjustment_reason" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"note" text NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "payroll_cash_adjustments_company_ym_idx" ON "payroll_cash_adjustments" USING btree ("company_id","ym");