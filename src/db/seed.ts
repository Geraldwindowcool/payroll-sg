// Run with `npm run db:seed`. Creates the two default companies (each with
// starter allowance types and levy presets, same as the original single-file
// app's demo data) and the first administrator account from ADMIN_EMAIL /
// ADMIN_NAME / ADMIN_PASSWORD in your environment. Safe to re-run — it skips
// anything that already exists instead of duplicating it.

import "dotenv/config";
import { db } from "./index";
import { companies, allowances, levies, users } from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";

const DEFAULT_COMPANY_NAMES = ["Window-Cool (S) Pte Ltd", "Window-Cool Sunshade Products"];

const DEFAULT_ALLOWANCES = [
  { name: "Scaffolding allowance", basis: "DAY" as const, rate: 25 },
  { name: "Height / rope access allowance", basis: "DAY" as const, rate: 30 },
  { name: "Site supervisor allowance", basis: "DAY" as const, rate: 15 },
  { name: "Attendance incentive", basis: "FIXED" as const, rate: 50 },
];

const DEFAULT_LEVIES = [
  { label: "Construction — Higher-skilled (R1)", amt: 300 },
  { label: "Construction — Basic-skilled (R2)", amt: 700 },
  { label: "Construction — Basic-skilled, MYE waiver", amt: 950 },
  { label: "No levy / not applicable", amt: 0 },
];

async function main() {
  console.log("Seeding...");

  for (const name of DEFAULT_COMPANY_NAMES) {
    const existing = await db.select().from(companies).where(eq(companies.name, name)).limit(1);
    if (existing.length) {
      console.log(`  company "${name}" already exists, skipping`);
      continue;
    }
    const [company] = await db.insert(companies).values({ name }).returning();
    await db.insert(allowances).values(DEFAULT_ALLOWANCES.map((a) => ({ ...a, companyId: company.id })));
    await db.insert(levies).values(DEFAULT_LEVIES.map((l) => ({ ...l, companyId: company.id })));
    console.log(`  created company "${name}" with starter allowances and levy presets`);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const adminName = process.env.ADMIN_NAME || "Admin";

  if (!adminEmail || !adminPassword) {
    console.log("  ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account creation.");
  } else {
    const existing = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    if (existing.length) {
      console.log(`  user "${adminEmail}" already exists, skipping`);
    } else {
      const passwordHash = await hashPassword(adminPassword);
      await db.insert(users).values({ email: adminEmail, name: adminName, passwordHash, role: "ADMIN" });
      console.log(`  created administrator account for ${adminEmail}`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
