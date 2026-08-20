import "dotenv/config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";

async function main() {
  const email = "preview@example.com";
  const password = "preview12345";
  const hash = await hashPassword(password);
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    await db.update(users).set({ passwordHash: hash, active: true, role: "ADMIN" }).where(eq(users.email, email));
    console.log("updated existing preview admin");
  } else {
    await db.insert(users).values({ email, passwordHash: hash, name: "Preview Admin", role: "ADMIN", active: true });
    console.log("created preview admin");
  }
  console.log("EMAIL:", email, "PASSWORD:", password);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
