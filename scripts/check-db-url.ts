// Safe diagnostic — prints ONLY non-secret structural info (length, and
// hostname/port/database if parseable) for every Postgres-connection-shaped
// env var Vercel might have given us, so we can find one that actually came
// through with a real value. Never prints usernames or passwords.
// Delete this file once the connection issue is sorted out.
import "dotenv/config";

const CANDIDATES = ["DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL_NO_SSL"];

for (const key of CANDIDATES) {
  const u = process.env[key] || "";
  console.log(`\n${key}`);
  console.log("  length:", u.length);
  if (!u) {
    console.log("  (not set)");
    continue;
  }
  try {
    const parsed = new URL(u);
    console.log("  looks like a real connection string ✅");
    console.log("  host:", parsed.hostname);
    console.log("  port:", parsed.port || "(default)");
    console.log("  database:", parsed.pathname);
  } catch {
    console.log("  does NOT parse as a URL (probably a placeholder) ❌");
  }
}
