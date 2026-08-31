ALTER TABLE "companies" ADD COLUMN "sun_ot_mult" numeric(4, 2) DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "sun_ot_mult" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "timesheet_weeks" ADD COLUMN "sun_ot" numeric(6, 2) DEFAULT 0 NOT NULL;