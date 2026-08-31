CREATE TABLE "mc_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"ym" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_data" "bytea" NOT NULL,
	"uploaded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "bank_cols" SET DEFAULT '[{"on":true,"head":"Payee Name","f":"name"},{"on":true,"head":"Bank Code","f":"bankCode"},{"on":true,"head":"Branch Code","f":"branchCode"},{"on":true,"head":"Account Number","f":"acct"},{"on":true,"head":"Amount","f":"amount"},{"on":true,"head":"Currency","f":"ccy"},{"on":true,"head":"Payment Date","f":"payDate"},{"on":true,"head":"Purpose Code","f":"payType"},{"on":true,"head":"Reference","f":"ref"}]'::jsonb;--> statement-breakpoint
CREATE INDEX "mc_attachments_employee_ym_idx" ON "mc_attachments" USING btree ("employee_id","ym");