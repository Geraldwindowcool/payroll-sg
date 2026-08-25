"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, allowedEmployeeIds } from "@/lib/access";
import { parseLeaveDaysField, replaceLeaveDaysForMonth } from "@/lib/saveLeaveDays";

/**
 * Saves the marked MC / paid leave / unpaid leave DATES for one employee's
 * month. This is intentionally the ONLY thing this action touches — it
 * never writes days/ot/xot/rdS/rdF/ph/allowanceQty, so a staff member on
 * this screen can never affect anything except leave, even though the
 * underlying timesheet rows are shared with the full admin timesheet.
 */
export async function saveLeaveAction(formData: FormData) {
  const user = await requireUser(); // STAFF or ADMIN — both may key in leave

  const companyId = String(formData.get("companyId") || "");
  const employeeId = String(formData.get("employeeId") || "");
  const ym = String(formData.get("ym") || "");
  if (!companyId || !employeeId || !/^\d{4}-\d{2}$/.test(ym)) return;

  // The real access boundary — a restricted Staff login can only save an
  // employee on their assigned list, regardless of what the form posted.
  const allowed = await allowedEmployeeIds();
  if (allowed && !allowed.has(employeeId)) return;

  const [emp] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId))).limit(1);
  if (!emp) return;

  const entries = parseLeaveDaysField(String(formData.get("leaveDays") || ""), ym);
  await replaceLeaveDaysForMonth({ companyId, employeeId, ym, pattern: emp.pattern, entries, userId: user.id });

  revalidatePath("/leave");
  revalidatePath("/attendance");
  revalidatePath("/admin/timesheet");
  revalidatePath("/admin/payrun");
  revalidatePath("/admin");
}
