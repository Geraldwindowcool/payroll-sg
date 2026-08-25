// Read-only — shows what's currently on file for the 5 people who turned
// out to already have records under Pte02 / Sunshade, so we can compare
// against the salary figures Gerald just gave in chat before changing
// anything. Safe to delete after.
import "dotenv/config";
import { db } from "@/db";
import { companies, employees } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const PTE01 = "Window-Cool (S) Pte Ltd 01";
const PTE02 = "Window-Cool (S) Pte Ltd 02";
const SUNSHADE = "Window-Cool Sunshade Products";

const CHECK = [
  { name: "Gerald Chia Chong Yee", company: PTE02 },
  { name: "Chia Meng Ngan", company: SUNSHADE },
  { name: "Tan Siew Hong", company: SUNSHADE },
  { name: "Foo Hoe Yin", company: SUNSHADE },
  { name: "Danny Wong Kam Lam", company: SUNSHADE },
];

async function main() {
  const allCompanies = await db.select().from(companies);
  const byName = new Map(allCompanies.map((c) => [c.name, c]));

  for (const c of CHECK) {
    const company = byName.get(c.company);
    if (!company) {
      console.log(`${c.name} @ ${c.company}: company not found`);
      continue;
    }
    const rows = await db.select().from(employees).where(and(eq(employees.companyId, company.id), eq(employees.name, c.name)));
    if (!rows.length) {
      console.log(`${c.name} @ ${c.company}: NOT FOUND (odd, script said it existed)`);
      continue;
    }
    for (const r of rows) {
      console.log(`${c.name} @ ${c.company}`);
      console.log(`  id: ${r.id}`);
      console.log(`  empNo: "${r.empNo}"  title: "${r.title}"  active: ${r.active}`);
      console.log(`  salary: $${r.salary}/mth`);
      console.log(`  nric: ${r.nric ? r.nric.slice(0, -4).replace(/./g, "•") + r.nric.slice(-4) : "(blank)"}`);
      console.log(`  cdacOn: ${r.cdacOn}  cdacAmt: ${r.cdacAmt}`);
      console.log(`  notes: ${r.notes ? r.notes.slice(0, 120) + (r.notes.length > 120 ? "…" : "") : "(none)"}`);
      console.log(`  createdAt: ${r.createdAt.toISOString()}`);
      console.log("");
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
