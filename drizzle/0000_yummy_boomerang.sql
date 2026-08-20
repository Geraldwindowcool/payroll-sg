CREATE TYPE "public"."allowance_basis" AS ENUM('DAY', 'HOUR', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."residency" AS ENUM('SC', 'PR', 'FW');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'STAFF');--> statement-breakpoint
CREATE TABLE "allowances" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"basis" "allowance_basis" DEFAULT 'DAY' NOT NULL,
	"rate" numeric(10, 2) DEFAULT 0 NOT NULL,
	"cpf_payable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"uen" text DEFAULT '' NOT NULL,
	"acct" text DEFAULT '' NOT NULL,
	"bank" text DEFAULT '' NOT NULL,
	"ref" text DEFAULT 'SALARY' NOT NULL,
	"hours_per_week" numeric(6, 2) DEFAULT 44 NOT NULL,
	"ot_mult" numeric(4, 2) DEFAULT 1.5 NOT NULL,
	"sdl_enabled" boolean DEFAULT true NOT NULL,
	"round_net" boolean DEFAULT false NOT NULL,
	"cpf" jsonb DEFAULT '{"owCeiling":8000,"annualCeiling":102000,"minWage":50,"lowBand":500,"fullBand":750,"bands":[{"id":"a55","label":"55 and below","maxAge":55},{"id":"a60","label":"Above 55 to 60","maxAge":60},{"id":"a65","label":"Above 60 to 65","maxAge":65},{"id":"a70","label":"Above 65 to 70","maxAge":70},{"id":"a99","label":"Above 70","maxAge":999}],"rates":{"full":{"a55":[37,20],"a60":[34,18],"a65":[25,12.5],"a70":[16.5,7.5],"a99":[12.5,5]},"pr1":{"a55":[9,5],"a60":[9,5],"a65":[8.5,5],"a70":[8.5,5],"a99":[8.5,5]},"pr2":{"a55":[24,15],"a60":[21,12.5],"a65":[17,7.5],"a70":[13,5],"a99":[11.5,5]}}}'::jsonb NOT NULL,
	"bank_cols" jsonb DEFAULT '[{"on":true,"head":"Payee Name","f":"name"},{"on":true,"head":"Bank Code","f":"bankCode"},{"on":true,"head":"Branch Code","f":"branchCode"},{"on":true,"head":"Account Number","f":"acct"},{"on":true,"head":"Amount","f":"amount"},{"on":true,"head":"Currency","f":"ccy"},{"on":true,"head":"Payment Date","f":"payDate"},{"on":true,"head":"Payment Type","f":"payType"},{"on":true,"head":"Reference","f":"ref"}]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_allowances" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"allowance_id" text NOT NULL,
	"rate_override" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"emp_no" text DEFAULT '' NOT NULL,
	"dob" text DEFAULT '' NOT NULL,
	"res" "residency" DEFAULT 'FW' NOT NULL,
	"pr_date" text DEFAULT '' NOT NULL,
	"salary" numeric(10, 2) DEFAULT 0 NOT NULL,
	"pattern" numeric(3, 1) DEFAULT 5 NOT NULL,
	"ot_elig" boolean DEFAULT true NOT NULL,
	"ot_mult" numeric(4, 2),
	"levy_id" text,
	"bank_name" text DEFAULT '' NOT NULL,
	"bank_code" text DEFAULT '' NOT NULL,
	"branch_code" text DEFAULT '' NOT NULL,
	"acct" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"cdac_on" boolean DEFAULT false NOT NULL,
	"cdac_amt" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levies" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"label" text NOT NULL,
	"amt" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_items" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"ym" text NOT NULL,
	"bonus" numeric(10, 2) DEFAULT 0 NOT NULL,
	"adj" numeric(10, 2) DEFAULT 0 NOT NULL,
	"adj_lbl" text DEFAULT '' NOT NULL,
	"reimb" numeric(10, 2) DEFAULT 0 NOT NULL,
	"reimb_lbl" text DEFAULT '' NOT NULL,
	"ded" numeric(10, 2) DEFAULT 0 NOT NULL,
	"ded_lbl" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet_weeks" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"ym" text NOT NULL,
	"week_index" integer NOT NULL,
	"days" numeric(4, 2),
	"ot" numeric(6, 2) DEFAULT 0 NOT NULL,
	"xot" numeric(6, 2) DEFAULT 0 NOT NULL,
	"rd_s" numeric(4, 2) DEFAULT 0 NOT NULL,
	"rd_f" numeric(4, 2) DEFAULT 0 NOT NULL,
	"ph" numeric(4, 2) DEFAULT 0 NOT NULL,
	"mc" numeric(4, 2) DEFAULT 0 NOT NULL,
	"pl" numeric(4, 2) DEFAULT 0 NOT NULL,
	"ul" numeric(4, 2) DEFAULT 0 NOT NULL,
	"allowance_qty" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_user_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" DEFAULT 'STAFF' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "allowances_company_idx" ON "allowances" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "emp_allow_unique" ON "employee_allowances" USING btree ("employee_id","allowance_id");--> statement-breakpoint
CREATE INDEX "employees_company_idx" ON "employees" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "levies_company_idx" ON "levies" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mo_item_unique" ON "monthly_items" USING btree ("employee_id","ym");--> statement-breakpoint
CREATE INDEX "mo_item_company_ym_idx" ON "monthly_items" USING btree ("company_id","ym");--> statement-breakpoint
CREATE UNIQUE INDEX "ts_week_unique" ON "timesheet_weeks" USING btree ("employee_id","ym","week_index");--> statement-breakpoint
CREATE INDEX "ts_week_company_ym_idx" ON "timesheet_weeks" USING btree ("company_id","ym");