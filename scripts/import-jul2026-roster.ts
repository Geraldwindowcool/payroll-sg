// One-time import of the Window-Cool (S) Pte Ltd ("Pte 01") staff roster
// from "WCSPL- STAFF SALARY&CPF&CDAC&SDF PTE-01 - JULY'26 310726.xls" into
// the payroll app's database.
//
// Safe to re-run: matches each row against what's already in the database
// (by NRIC where we have one, otherwise by name) and skips anyone already
// present instead of creating a duplicate.
//
// USAGE
//   npx tsx scripts/import-jul2026-roster.ts            # dry run — prints what it WOULD do, writes nothing
//   npx tsx scripts/import-jul2026-roster.ts --commit    # actually writes to the database
//
// Review the dry-run output carefully before adding --commit — this is
// real employee data going into the real payroll database.

import "dotenv/config";
import { db } from "@/db";
import { companies, employees, levies } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const COMMIT = process.argv.includes("--commit");
const PTE01 = "Window-Cool (S) Pte Ltd 01";
const PTE02 = "Window-Cool (S) Pte Ltd 02";

type Row = {
  empNo: string;
  name: string;
  nric: string; // "" where the source document's ID field was garbled/unreadable
  dob: string; // ISO
  joinDate: string; // ISO
  title: string;
  res: "SC" | "PR" | "FW";
  salary: number;
  active: boolean;
  levyAmt?: number; // undefined = no levy
  cdacOn: boolean;
  cdacAmt?: number;
  bankName?: string;
  acct?: string;
  notes: string;
  company?: string; // defaults to PTE01
};

const ROSTER: Row[] = [
  { empNo: "1", name: "Chia Meng Ngan", nric: "S7001745H", dob: "1970-01-10", joinDate: "2005-03-01", title: "Project Director", res: "SC", salary: 2100, active: true, cdacOn: true, cdacAmt: 1.0, notes: "Project Director/SH — 30% pay cut applied (-$900) from 31/08. Paid via GIRO; bank account not on file, please add." },
  { empNo: "2", name: "Tan Siew Hong", nric: "S7224754Z", dob: "1972-07-16", joinDate: "2005-03-01", title: "HR Director / Secretary", res: "SC", salary: 2500, active: true, cdacOn: true, cdacAmt: 1.0, notes: "HR Director/Secretary, WFH — 30% back-pay top-up (+$750) from 31/07/23, increase backdated to 30/05/23. Paid via GIRO; bank account not on file, please add." },
  { empNo: "3", name: "Foo Hoe Yin", nric: "S7021602G", dob: "1970-07-02", joinDate: "2005-01-04", title: "Project Manager", res: "SC", salary: 1900, active: true, cdacOn: true, cdacAmt: 0.5, bankName: "DBS", acct: "262-008104-3", notes: "Project Manager." },
  { empNo: "4", name: "Danny Wong Kam Lam", nric: "S1631131F", dob: "1964-07-17", joinDate: "2021-06-17", title: "Project Consultant", res: "SC", salary: 1900, active: true, cdacOn: true, cdacAmt: 0.5, bankName: "POSB", acct: "010139260", notes: "Project Consultant. Previously $3,500/mth, reduced to $1,900 + $150 increment. Joined WCSP at $1,900 on 1/02/22." },
  { empNo: "0", name: "Tan Kee Moy", nric: "S1508967I", dob: "1961-01-14", joinDate: "2013-03-01", title: "", res: "SC", salary: 0, active: false, cdacOn: false, notes: "RESIGNED 31/05/2026 — fell ill since Apr'26. CPF history: +$225 increment 1/2/21 (EE +$46, ER -$1), +$650 May'21, CPF EE rate raised Mar'22, CPF Jan'23 EE 14%→15% & ER 10%→11%, +$200 increment 1/07/24 ($1.4K→$1.6K), Feb'26 CPF reduced to 7.5% ER ($144) & 7.5% EE ($120)." },
  { empNo: "5", name: "Lawrence Tan Chong Meng", nric: "S7022415A", dob: "1970-07-02", joinDate: "2014-04-01", title: "Customer Support / Marketing", res: "SC", salary: 1800, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Customer Support/Marketing. +$100 increment 01/07/24 ($1.5K→$1.6K). +$200 increment starting Jul'26 → now $1,800." },
  { empNo: "6", name: "Lim Hui Yen", nric: "S6820777J", dob: "1968-06-02", joinDate: "2014-04-01", title: "Customer Support", res: "SC", salary: 1800, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Customer Support. +$11 increment starting Jul'26 → now $1,800." },
  { empNo: "7", name: "Lim Chin Choy", nric: "S1477115H", dob: "1952-09-01", joinDate: "2020-02-01", title: "Dispatch / Driver", res: "SC", salary: 1830, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Dispatch/Driver. +$430 increment 1/2/21. +$200 increment starting Jul'26 → now $1,830." },
  { empNo: "8", name: "Tee Kim Chuan", nric: "S2660453B", dob: "1950-05-28", joinDate: "2026-03-01", title: "Cutting / Film Sampling", res: "SC", salary: 1830, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Cut film and sampling. +$200 increment starting Jul'26 → now $1,830." },
  { empNo: "9", name: "Nicole Tan", nric: "T0224034Z", dob: "2002-01-01", joinDate: "2021-02-01", title: "Telemarketing (WFH)", res: "SC", salary: 1800, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Telemarketing, WFH. +$150 increment 01/07/24 ($1.45K→$1.6K). +$200 increment starting Jul'26 → now $1,800." },
  { empNo: "0", name: "Sabrina Tan", nric: "S9624791E", dob: "1996-07-05", joinDate: "2025-09-02", title: "IT Support", res: "SC", salary: 0, active: false, cdacOn: false, notes: "RESIGNED (source document shows 31/04/26, likely means 30/04/26). IT Support — CPF remained unchanged before resignation." },
  { empNo: "10", name: "Reuben Chia Chong Wei", nric: "T0629527J", dob: "2006-09-13", joinDate: "2021-02-01", title: "Assistant SEO / Backlink Support (WFH)", res: "SC", salary: 1810, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Assistant SEO/Backlink Support, WFH. +$200 increment 01/07/24 ($1.41K→$1.61K). +$200 increment starting Jul'26 → now $1,810." },
  { empNo: "0", name: "Tan Ah Moy", nric: "S0492248D", dob: "1947-10-20", joinDate: "2021-02-01", title: "Sampler (WFH)", res: "SC", salary: 0, active: false, cdacOn: false, notes: "RESIGNED 30/06/26. Sampler, WFH. +$200 increment 01/07/24 ($1.415K→$1.615K)." },
  { empNo: "11", name: "Tan Joo Meng", nric: "S7100666B", dob: "1971-01-11", joinDate: "2026-06-01", title: "Site Coordinator", res: "SC", salary: 1800, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Site Coordinator, SH. Resigned last day 30/09/24, rejoined Jan'25, resigned again last day 30/11/25, rejoined 01/05/26 at $1,600. +$180 increment starting Jul'26 → now $1,800." },
  { empNo: "12", name: "Gerald Chia Chong Yee", nric: "T0031258J", dob: "2000-08-10", joinDate: "2021-11-01", title: "Assistant Manager / IT / Web Assistant (WFH)", res: "SC", salary: 2500, active: true, cdacOn: true, cdacAmt: 1.0, bankName: "OCBC", acct: "515668382001", notes: "Assistant Manager, IT/Web assistant, WFH. Increment $1K→$2.5K Sept'23." },
  { empNo: "13", name: "Darren Tan Han Rong", nric: "S9438152E", dob: "1994-10-19", joinDate: "2023-07-01", title: "Assistant Manager", res: "SC", salary: 4000, active: true, cdacOn: true, cdacAmt: 1.0, notes: "Assistant Manager. +$1,000 increment 01/08/24." },
  { empNo: "14", name: "Pamela Tan Sok Chi", nric: "S9503003C", dob: "1995-01-29", joinDate: "2025-05-14", title: "Site Coordinator", res: "SC", salary: 1800, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Site Coordinator. Joined 15/05/23 with WCSP for 5.5 days, rejoined 01/05/25. +$200 increment starting Jul'26 → now $1,800." },
  { empNo: "15", name: "Lim Zhiyu Joie", nric: "T0206380D", dob: "2002-03-01", joinDate: "2025-12-01", title: "Telemarketing (WFH)", res: "SC", salary: 1830, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Telemarketing, WFH. Started 01/12/2025 at $1.6K. +$230 increment starting Jul'26 → now $1,830." },
  { empNo: "16", name: "Jennifer Chia Mui Chin", nric: "S1802949I", dob: "1967-07-23", joinDate: "2025-12-01", title: "Telemarketing (WFH)", res: "SC", salary: 1800, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Telemarketing, WFH. Started 01/12/2025 at $1.6K. +$200 increment starting Jul'26 → now $1,800." },
  { empNo: "17", name: "Tan Ah Huay", nric: "S1776819J", dob: "1966-03-10", joinDate: "2026-05-01", title: "Telemarketing (WFH)", res: "SC", salary: 1800, active: true, cdacOn: true, cdacAmt: 0.5, notes: "Telemarketing, WFH. Started 01/05/2026 at $1.6K. +$200 increment starting Jul'26 → now $1,800. Also referred to as \"Chris\" in payroll notes." },
  { empNo: "19", name: "Yumei", nric: "78509724", dob: "1982-02-25", joinDate: "2023-05-12", title: "Personnel / Human Resource Officer", res: "FW", salary: 2100, active: true, levyAmt: 400, cdacOn: false, bankName: "POSB", acct: "446593358", notes: "Personnel/HR Officer. Work Permit holder. Confirmed Aug'23 +$100; +$100 31/03/25; WP renewed 5/04/25 +$100; +$200 30/06/25. Jul'26 pay was $2,250 = $2,100 base + $500 performance − $350 for 4 days unpaid leave (one-off items, not part of the standing rate)." },
  { empNo: "20", name: "Jance Ma Cristel Geduspan", nric: "G3192679W", dob: "1991-10-02", joinDate: "2015-07-20", title: "Marketing Sales Executive (WFH, Philippines)", res: "FW", salary: 1650, active: true, cdacOn: false, bankName: "DBS", acct: "117167836", notes: "S Pass holder. Marketing Sales Executive, WFH from the Philippines. Joined 01/04/23. +$50 increment 30/06, subject to performance." },
  { empNo: "21", name: "Maricel Magtoto Laurio", nric: "G6267111X", dob: "1979-09-23", joinDate: "2025-06-26", title: "IT Support / Web Master", res: "FW", salary: 4650, active: true, cdacOn: false, notes: "S Pass holder. IT Support/Web Master. +$100 increment Aug'23, no deduction Sep'23 (birthday leave gift). STVP started 28/03/25 ($3,200/12×6=$1,600 Jan–Mar) + Jul'25–Dec'25 ($4,650/12×6=$2,325); total $3,925." },
  { empNo: "22", name: "Ling Kee Leong", nric: "G6718717U", dob: "1987-04-10", joinDate: "2010-05-31", title: "Technician", res: "FW", salary: 3600, active: true, levyAmt: 300, cdacOn: false, notes: "S Pass holder (source sheet had mistakenly marked \"SC\" — confirmed FW/S Pass). Technician. SH increment +$300 1/4/21, +$200 30/10, +$200 01/02/22." },
  { empNo: "23", name: "Wong Wai Foo", nric: "", dob: "1991-01-19", joinDate: "2018-05-14", title: "Technician", res: "FW", salary: 3500, active: true, levyAmt: 400, cdacOn: false, notes: "Work Permit holder — NRIC/FIN field in source document was garbled (\"G6810773W/4 03616729\"); please enter the correct FIN from their work pass/IC. SH increment +$100 Feb'21, +$100 Jun'21, +$200 30/10, +$200 01/02/22. Hospital leave 22–29/09/23. +$200 increment 01/03/26." },
  // Moved to Pte 02 on Gerald's confirmation (see scripts/move-rasu-to-pte02.ts)
  // — kept pointed at PTE02 here too so re-running this import stays safe
  // and doesn't recreate him under Pte 01.
  { empNo: "24", name: "Rasu Pandian", nric: "33951086", dob: "1989-04-06", joinDate: "2024-07-02", title: "Builder", res: "FW", salary: 1600, active: true, levyAmt: 500, cdacOn: false, bankName: "OCBC", acct: "576400139001", company: PTE02, notes: "Work Permit holder (\"Lucas Builder\"), joined 09/03/24, started with company 02/07/24. Salary advance: $1,800 full advance for May'26, $1,200 partial advance for Jun'26 — remaining $600 balance to be deducted at $300/month across Jul'26 and Aug'26 pay." },
  // Appears on the Pte-01 sheet but is excluded from every one of its totals
  // (gross pay, total salary, levy and SDF each reconcile only once his row
  // is left out), and the sheet carries a "PTE-02" annotation — so he is
  // paid under Pte 02, confirmed with Gerald.
  { empNo: "25", name: "Muthu Manikandan", nric: "", dob: "2003-12-29", joinDate: "2026-04-28", title: "Junior Technician", res: "FW", salary: 1200, active: true, levyAmt: 900, cdacOn: false, bankName: "POSB", acct: "455557356", company: PTE02, notes: "Work Permit holder — NRIC/FIN field in source document was garbled (\"39693844/M35902 91\"); please enter the correct FIN from their work pass. Junior Technician, Rasu Pandian's friend, joined 28/04/26. Pay includes 3 days at $7.50/wk per MOM calculation on employment details. Listed on the Pte-01 sheet but excluded from its totals — paid under Pte 02." },
];

async function findOrCreateLevy(companyId: string, amt: number): Promise<string> {
  const existing = await db.select().from(levies).where(and(eq(levies.companyId, companyId), eq(levies.amt, amt))).limit(1);
  if (existing.length) return existing[0].id;
  if (!COMMIT) return "(would create)";
  const [created] = await db.insert(levies).values({ companyId, label: `Levy $${amt}/mth`, amt }).returning();
  return created.id;
}

async function main() {
  const allCompanies = await db.select().from(companies);
  const byName = new Map(allCompanies.map((c) => [c.name, c]));

  // Fail before writing anything if any company named on the roster is missing.
  const wanted = Array.from(new Set(ROSTER.map((r) => r.company ?? PTE01)));
  const missing = wanted.filter((n) => !byName.has(n));
  if (missing.length) {
    console.error(`Company not found: ${missing.map((m) => `"${m}"`).join(", ")}`);
    console.error("Companies on file:");
    for (const c of allCompanies) console.error(`  - ${c.name}`);
    process.exit(1);
  }

  for (const n of wanted) console.log(`Company: ${n} (${byName.get(n)!.id})`);
  console.log(COMMIT ? "*** COMMIT MODE — this will write to the database ***" : "--- DRY RUN — nothing will be written. Re-run with --commit to actually import. ---");
  console.log("");

  let added = 0,
    skipped = 0;

  for (const row of ROSTER) {
    const company = byName.get(row.company ?? PTE01)!;
    const intoLabel = row.company ? `  → ${row.company}` : "";
    const existing = row.nric
      ? await db.select().from(employees).where(and(eq(employees.companyId, company.id), eq(employees.nric, row.nric))).limit(1)
      : await db.select().from(employees).where(and(eq(employees.companyId, company.id), eq(employees.name, row.name))).limit(1);

    if (existing.length) {
      console.log(`SKIP  (already exists) — ${row.name}${intoLabel}`);
      skipped++;
      continue;
    }

    let levyId: string | null = null;
    if (row.levyAmt) levyId = await findOrCreateLevy(company.id, row.levyAmt);

    console.log(`ADD   ${row.name} — ${row.res}, $${row.salary}/mth, ${row.active ? "active" : "INACTIVE"}${row.levyAmt ? `, levy $${row.levyAmt}` : ""}${row.nric ? "" : "  [NRIC MISSING — fill in later]"}${intoLabel}`);

    if (COMMIT) {
      await db.insert(employees).values({
        companyId: company.id,
        name: row.name,
        empNo: row.empNo,
        nric: row.nric,
        dob: row.dob,
        joinDate: row.joinDate,
        title: row.title,
        res: row.res,
        salary: row.salary,
        active: row.active,
        levyId,
        cdacOn: row.cdacOn,
        cdacAmt: row.cdacAmt ?? null,
        bankName: row.bankName ?? "",
        acct: row.acct ?? "",
        notes: row.notes,
      });
    }
    added++;
  }

  console.log("");
  console.log(`${COMMIT ? "Added" : "Would add"}: ${added}   Skipped (already present): ${skipped}   Total on roster: ${ROSTER.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
