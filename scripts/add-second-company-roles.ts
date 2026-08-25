// Adds a second employee record for people who work across more than one
// Window-Cool entity — Gerald (Pte01 + Pte02), and Bernard/Stephanie/Andy/
// Danny (Pte01 + Sunshade), per Gerald's confirmation in chat. Each person
// keeps ONE employee record per company they're actually paid by; this
// copies their identity details (NRIC, DOB, residency, bank) from their
// existing record and lets you set the salary for the new company.
//
// CDAC (community fund) is deliberately left OFF on these new records —
// it's normally deducted once via a person's main employer, and silently
// turning it on for a second record would double-deduct from the same
// person. Toggle it on later per person if that's actually wanted.
//
// USAGE
//   npx tsx scripts/add-second-company-roles.ts            # dry run
//   npx tsx scripts/add-second-company-roles.ts --commit    # actually writes

import "dotenv/config";
import { db } from "@/db";
import { companies, employees } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const COMMIT = process.argv.includes("--commit");
const PTE01 = "Window-Cool (S) Pte Ltd 01";
const PTE02 = "Window-Cool (S) Pte Ltd 02";
const SUNSHADE = "Window-Cool Sunshade Products";

const PLAN = [
  { name: "Gerald Chia Chong Yee", from: PTE01, to: PTE02, salary: 2000 },
  { name: "Chia Meng Ngan", from: PTE01, to: SUNSHADE, salary: 2100 }, // "Bernard" — same as Pte01
  { name: "Tan Siew Hong", from: PTE01, to: SUNSHADE, salary: 1000 }, // "Stephanie"
  { name: "Foo Hoe Yin", from: PTE01, to: SUNSHADE, salary: 1900 }, // "Andy" — same as Pte01
  { name: "Danny Wong Kam Lam", from: PTE01, to: SUNSHADE, salary: 1900 }, // "Danny" — same as Pte01
];

async function main() {
  const allCompanies = await db.select().from(companies);
  const byName = new Map(allCompanies.map((c) => [c.name, c]));

  console.log(COMMIT ? "*** COMMIT MODE ***" : "--- DRY RUN — nothing will be written ---");
  console.log("");

  for (const plan of PLAN) {
    const fromCompany = byName.get(plan.from);
    const toCompany = byName.get(plan.to);
    if (!fromCompany || !toCompany) {
      console.log(`SKIP  ${plan.name} — company not found (${plan.from} → ${plan.to})`);
      continue;
    }

    const [source] = await db.select().from(employees).where(and(eq(employees.companyId, fromCompany.id), eq(employees.name, plan.name))).limit(1);
    if (!source) {
      console.log(`SKIP  ${plan.name} — not found under ${plan.from}`);
      continue;
    }

    const existing = await db.select().from(employees).where(and(eq(employees.companyId, toCompany.id), eq(employees.nric, source.nric))).limit(1);
    if (existing.length) {
      console.log(`SKIP  ${plan.name} — already has a record under ${plan.to}`);
      continue;
    }

    console.log(`ADD   ${plan.name} → ${plan.to}, $${plan.salary}/mth (copied from ${plan.from}: NRIC, DOB, title, bank details)`);

    if (COMMIT) {
      await db.insert(employees).values({
        companyId: toCompany.id,
        name: source.name,
        empNo: "",
        nric: source.nric,
        dob: source.dob,
        joinDate: source.joinDate,
        title: source.title,
        res: source.res,
        salary: plan.salary,
        active: true,
        levyId: null,
        cdacOn: false,
        cdacAmt: null,
        bankName: source.bankName,
        bankCode: source.bankCode,
        branchCode: source.branchCode,
        acct: source.acct,
        notes: `Also employed under ${plan.from} at $${source.salary}/mth. NRIC/DOB/bank details copied from that record. CDAC left off here to avoid double-deducting — turn on if this is meant to be a separate CDAC deduction.`,
      });
    }
  }

  console.log("");
  console.log(COMMIT ? "Done." : "Re-run with --commit to actually add these.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
