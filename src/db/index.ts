import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __payrollPool: Pool | undefined;
}

// Reuse the pool across hot reloads in dev, and across warm serverless
// invocations in production — creating a new Pool per request would
// exhaust Postgres connections fast on Vercel's serverless functions.
const pool =
  global.__payrollPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === "production" ? 3 : 10,
  });

if (process.env.NODE_ENV !== "production") global.__payrollPool = pool;

export const db = drizzle(pool, { schema });
