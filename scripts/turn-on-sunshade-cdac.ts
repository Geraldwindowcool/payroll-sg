// One-time fix: Gerald confirmed CDAC should be deducted from these 4
// people under BOTH their Pte01 and Sunshade pay (a deliberate exception —
// normally CDAC is deducted once via the main job, but he wants it on
// both here). Turns cdacOn on for their Sunshade records, using the same
// $0.50-under-$2K / $1.00-at-$2K-plus rule the app uses everywhere,
// based on each person's SUNSHADE salary (not their Pte01 one).
//
// USAGE
//   npx tsx scripts/turn-on-sunshade-cdac.ts            # dry run
//   npx tsx scripts/turn-on-sunshade-cdac.ts --commit    # actually writes

import "dotenv/config";
import { db } from "@/db";
import { companies, employees } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const COMMIT = process.argv.includes("--commit");
const SUNSHADE = "Window-Cool Sunshade Products";
const NAMES = ["Chia Meng Ngan", "Tan Siew Hong", "Foo Hoe Yin", "Danny Wong Kam Lam"];

function cdacAmtFor(salary: number) {
  return salary >= 2000 ? 1.0 : 0.5;
}

async function main() {
  const [sunshade] = await db.select().from(companies).where(eq(companies.name, SUNSHADE)).limit(1);
  if (!sunshade) {
    console.error(`Company "${SUNSHADE}" not found.`);
    process.exit(1);
  }

  console.log(COMMIT ? "*** COMMIT MODE ***" : "--- DRY RUN — nothing will be written ---");

  for (const name of NAMES) {
    const [emp] = await db.select().from(employees).where(and(eq(employees.companyId, sunshade.id), eq(employees.name, name))).limit(1);
    if (!emp) {
      console.log(`SKIP  ${name} — not found under ${SUNSHADE}`);
      continue;
    }
    const cdacAmt = cdacAmtFor(emp.salary);
    console.log(`${emp.cdacOn ? "ALREADY ON" : "TURN ON "}  ${name} — salary $${emp.salary}/mth → CDAC $${cdacAmt}`);

    if (COMMIT) {
      await db
        .update(employees)
        .set({
          cdacOn: true,
          cdacAmt,
          notes: emp.notes.replace(
            " CDAC left off here to avoid double-deducting — turn on if this is meant to be a separate CDAC deduction.",
            " CDAC deducted on both this record and Pte01 — confirmed deliberate by Gerald (not the usual once-per-person default)."
          ),
          updatedAt: new Date(),
        })
        .where(eq(employees.id, emp.id));
    }
  }

  console.log(COMMIT ? "Done." : "Re-run with --commit to actually apply this.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
