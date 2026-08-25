import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employeeAccess } from "@/db/schema";
import { eq } from "drizzle-orm";

export class AccessError extends Error {}

/** Any signed-in user (ADMIN or STAFF). Throws if not logged in. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new AccessError("Not signed in.");
  return session.user;
}

/** ADMIN only — full payroll access. Throws otherwise. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AccessError("Administrator access required.");
  return user;
}

/** The employee IDs the current user is allowed to see/edit on the
 *  attendance and MC/leave screens, or `null` for "no restriction" —
 *  every Administrator, and any Staff login that hasn't been given a
 *  specific list yet from Settings (so nobody's access silently narrows
 *  just because this feature exists). Once an admin assigns at least one
 *  employee to a Staff login, that login is locked to exactly that list. */
export async function allowedEmployeeIds(): Promise<Set<string> | null> {
  const user = await requireUser();
  if (user.role === "ADMIN") return null;
  const rows = await db.select({ employeeId: employeeAccess.employeeId }).from(employeeAccess).where(eq(employeeAccess.userId, user.id));
  if (!rows.length) return null;
  return new Set(rows.map((r) => r.employeeId));
}
