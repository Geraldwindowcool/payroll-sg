CREATE TABLE "employee_access" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"employee_id" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_employee_access_unique" ON "employee_access" USING btree ("user_id","employee_id");--> statement-breakpoint
CREATE INDEX "employee_access_user_idx" ON "employee_access" USING btree ("user_id");