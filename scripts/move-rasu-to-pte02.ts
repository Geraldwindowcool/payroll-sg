// One-time move: Rasu Pandian, currently under Pte 01, to Pte 02.
// Moving companies isn't just flipping one field — his levy tier and any
// month-specific records are scoped to a company too, so this script keeps
// all of that consistent instead of leaving orphaned references behind.
//
// USAGE
//   npx tsx scripts/move-rasu-to-pte02.ts            # dry run — prints what it WOULD do
//   npx tsx scripts/move-rasu-to-pte02.ts --commit    # actually makes the change

import "dotenv/config";
import { db } from "@/db";
import { companies, employees, levies, employeeAllowances, timesheetWeeks, monthlyItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const COMMIT = process.argv.includes("--commit");
const FROM = "Window-Cool (S) Pte Ltd 01";
const TO = "Window-Cool (S) Pte Ltd 02";
const EMPLOYEE_NAME = "Rasu Pandian";

async function main() {
  const [fromCompany] = await db.select().from(companies).where(eq(companies.name, FROM)).limit(1);
  const [toCompany] = await db.select().from(companies).where(eq(companies.name, TO)).limit(1);
  if (!fromCompany || !toCompany) {
    console.error("Could not find one or both companies:", { FROM, TO });
    process.exit(1);
  }

  const [emp] = await db.select().from(employees).where(and(eq(employees.companyId, fromCompany.id), eq(employees.name, EMPLOYEE_NAME))).limit(1);
  if (!emp) {
    console.error(`"${EMPLOYEE_NAME}" not found under ${FROM} — already moved, or name doesn't match exactly.`);
    process.exit(1);
  }

  console.log(COMMIT ? "*** COMMIT MODE ***" : "--- DRY RUN — nothing will be written ---");
  console.log(`Moving "${emp.name}" from ${FROM} to ${TO}`);

  // Carry his levy tier over — his current levy is scoped to Pte 01, so we
  // need the equivalent (same amount) under Pte 02, creating it if needed.
  let newLevyId: string | null = null;
  if (emp.levyId) {
    const [oldLevy] = await db.select().from(levies).where(eq(levies.id, emp.levyId)).limit(1);
    if (oldLevy) {
      const [existingLevy] = await db.select().from(levies).where(and(eq(levies.companyId, toCompany.id), eq(levies.amt, oldLevy.amt))).limit(1);
      if (existingLevy) {
        newLevyId = existingLevy.id;
        console.log(`  levy: reusing existing $${oldLevy.amt}/mth levy under ${TO}`);
      } else {
        console.log(`  levy: will create a new $${oldLevy.amt}/mth levy under ${TO}`);
        if (COMMIT) {
          const [created] = await db.insert(levies).values({ companyId: toCompany.id, label: oldLevy.label, amt: oldLevy.amt }).returning();
          newLevyId = created.id;
        }
      }
    }
  }

  // Check for anything else tied to him that's scoped to the old company —
  // expected to be empty for a freshly-imported employee, but don't assume.
  const links = await db.select().from(employeeAllowances).where(eq(employeeAllowances.employeeId, emp.id));
  const weeks = await db.select().from(timesheetWeeks).where(eq(timesheetWeeks.employeeId, emp.id));
  const items = await db.select().from(monthlyItems).where(eq(monthlyItems.employeeId, emp.id));
  if (links.length) console.log(`  NOTE: ${links.length} allowance link(s) tied to Pte 01 allowances will be removed — allowances aren't shared between companies, re-add under Pte 02 if needed.`);
  if (weeks.length) console.log(`  timesheet weeks to re-point to Pte 02: ${weeks.length}`);
  if (items.length) console.log(`  monthly items to re-point to Pte 02: ${items.length}`);

  if (COMMIT) {
    await db.update(employees).set({ companyId: toCompany.id, levyId: newLevyId, updatedAt: new Date() }).where(eq(employees.id, emp.id));
    if (links.length) await db.delete(employeeAllowances).where(eq(employeeAllowances.employeeId, emp.id));
    if (weeks.length) await db.update(timesheetWeeks).set({ companyId: toCompany.id }).where(eq(timesheetWeeks.employeeId, emp.id));
    if (items.length) await db.update(monthlyItems).set({ companyId: toCompany.id }).where(eq(monthlyItems.employeeId, emp.id));
    console.log("Done.");
  } else {
    console.log("\nRe-run with --commit to actually make this change.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
