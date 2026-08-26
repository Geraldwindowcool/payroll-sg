"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, allowedEmployeeIds } from "@/lib/access";
import { replaceLeaveDaysForMonth } from "@/lib/saveLeaveDays";
import type { LeaveDayEntry, LeaveType } from "@/lib/leave";

const VALID_TYPES: LeaveType[] = ["MC", "PL", "UL"];

/** Saves the calendar the instant someone taps a date — called directly
 *  from LeaveCalendar (not through a <form>), the same way CompanySwitcher
 *  calls its action, so a tap gets an immediate "Saved" confirmation
 *  instead of the person having to scroll down, find a Save button, and
 *  trust that it covered what they just tapped.
 *
 *  This is genuinely called from client code with arbitrary data, so
 *  nothing here is trusted at face value — dates outside the month and
 *  unknown types are dropped, and a restricted Staff login is still
 *  confined to their assigned employees, exactly like the form-based
 *  saves. */
export async function autoSaveLeaveDaysAction(companyId: string, employeeId: string, ym: string, entries: LeaveDayEntry[]): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!companyId || !employeeId || !/^\d{4}-\d{2}$/.test(ym)) return { ok: false };

  const allowed = await allowedEmployeeIds();
  if (allowed && !allowed.has(employeeId)) return { ok: false };

  const [emp] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId))).limit(1);
  if (!emp) return { ok: false };

  const cleaned = entries.filter(
    (e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.date.startsWith(`${ym}-`) && VALID_TYPES.includes(e.type)
  );

  await replaceLeaveDaysForMonth({ companyId, employeeId, ym, pattern: emp.pattern, entries: cleaned, userId: user.id });

  revalidatePath("/attendance");
  revalidatePath("/leave");
  revalidatePath("/admin/timesheet");
  revalidatePath("/admin/payrun");
  revalidatePath("/admin/payroll");
  return { ok: true };
}
