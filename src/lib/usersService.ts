import "server-only";
import { db } from "@/db";
import { users, employees, employeeAccess } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUsers() {
  return db.select().from(users).orderBy(users.createdAt);
}

/** For every STAFF user, the set of employee IDs (within the given
 *  company) they're currently assigned — used to pre-check the "Employee
 *  access" checklist in Settings. Admins don't need entries here since
 *  they're never restricted. */
export async function getEmployeeAccessByUser(companyId: string): Promise<Map<string, Set<string>>> {
  const rows = await db
    .select({ userId: employeeAccess.userId, employeeId: employeeAccess.employeeId })
    .from(employeeAccess)
    .innerJoin(employees, eq(employees.id, employeeAccess.employeeId))
    .where(eq(employees.companyId, companyId));
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = map.get(r.userId) ?? new Set<string>();
    set.add(r.employeeId);
    map.set(r.userId, set);
  }
  return map;
}
