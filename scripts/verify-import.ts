// Read-only check that the July 2026 roster import landed correctly.
// Prints counts and totals per company — no writes. Safe to delete after.
import "dotenv/config";
import { db } from "@/db";
import { companies, employees } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const all = await db.select().from(companies);
  for (const c of all) {
    const rows = await db.select().from(employees).where(eq(employees.companyId, c.id));
    if (!rows.length) {
      console.log(`\n${c.name}: (no employees)`);
      continue;
    }
    const active = rows.filter((r) => r.active);
    const grossActive = active.reduce((s, r) => s + r.salary, 0);
    console.log(`\n${c.name}`);
    console.log(`  employees: ${rows.length}  (active ${active.length}, inactive ${rows.length - active.length})`);
    console.log(`  active monthly salary total: $${grossActive.toLocaleString("en-SG", { minimumFractionDigits: 2 })}`);
    const missingNric = rows.filter((r) => !r.nric).map((r) => r.name);
    if (missingNric.length) console.log(`  NRIC/FIN still blank: ${missingNric.join(", ")}`);
    const noTitle = rows.filter((r) => !r.title && r.active).map((r) => r.name);
    if (noTitle.length) console.log(`  no job title: ${noTitle.join(", ")}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
