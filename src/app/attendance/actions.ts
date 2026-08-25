"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { timesheetWeeks, employees } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, allowedEmployeeIds } from "@/lib/access";
import { weeksOfMonth } from "@/lib/payroll";
import { parseLeaveDaysField, replaceLeaveDaysForMonth } from "@/lib/saveLeaveDays";

function numOrZero(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const raw = String(v ?? "").trim();
  if (raw === "") return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/** Saves one employee's whole month: their marked MC/leave dates plus the
 *  per-week hours. Open to STAFF as well as ADMIN, but a restricted Staff
 *  login can only ever save an employee on their assigned list — checked
 *  here rather than relying on the page having hidden the others. */
export async function saveAttendanceAction(formData: FormData) {
  const user = await requireUser();

  const companyId = String(formData.get("companyId") || "");
  const employeeId = String(formData.get("employeeId") || "");
  const ym = String(formData.get("ym") || "");
  const allowanceIds = String(formData.get("allowanceIds") || "")
    .split(",")
    .filter(Boolean);

  if (!companyId || !employeeId || !/^\d{4}-\d{2}$/.test(ym)) return;

  const allowed = await allowedEmployeeIds();
  if (allowed && !allowed.has(employeeId)) return;

  // The work pattern decides what a marked date is worth (a Saturday is
  // half a day on a 5.5-day week, nothing on a 5-day one), so read it from
  // the employee record rather than trusting anything posted.
  const [emp] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId))).limit(1);
  if (!emp) return;

  const entries = parseLeaveDaysField(String(formData.get("leaveDays") || ""), ym);
  await replaceLeaveDaysForMonth({ companyId, employeeId, ym, pattern: emp.pattern, entries, userId: user.id });

  // Then the per-week hours. mc/pl/ul are deliberately NOT written here —
  // replaceLeaveDaysForMonth already set them from the calendar, and
  // writing them again from the form would undo that.
  for (const w of weeksOfMonth(ym)) {
    const allowanceQty: Record<string, number> = {};
    for (const allowanceId of allowanceIds) {
      const q = numOrZero(formData.get(`qty_${w.i}_${allowanceId}`));
      if (q) allowanceQty[allowanceId] = q;
    }

    const patch = {
      days: numOrNull(formData.get(`days_${w.i}`)),
      ot: numOrZero(formData.get(`ot_${w.i}`)),
      xot: numOrZero(formData.get(`xot_${w.i}`)),
      rdS: numOrZero(formData.get(`rdS_${w.i}`)),
      rdF: numOrZero(formData.get(`rdF_${w.i}`)),
      ph: numOrZero(formData.get(`ph_${w.i}`)),
      allowanceQty,
      updatedByUserId: user.id,
      updatedAt: new Date(),
    };

    const existing = await db
      .select({ id: timesheetWeeks.id })
      .from(timesheetWeeks)
      .where(and(eq(timesheetWeeks.employeeId, employeeId), eq(timesheetWeeks.ym, ym), eq(timesheetWeeks.weekIndex, w.i)))
      .limit(1);

    if (existing.length) {
      await db.update(timesheetWeeks).set(patch).where(eq(timesheetWeeks.id, existing[0].id));
    } else {
      await db.insert(timesheetWeeks).values({ companyId, employeeId, ym, weekIndex: w.i, ...patch });
    }
  }

  revalidatePath("/attendance");
  revalidatePath("/leave");
  revalidatePath("/admin/timesheet");
  revalidatePath("/admin/payrun");
  revalidatePath("/admin");
}
