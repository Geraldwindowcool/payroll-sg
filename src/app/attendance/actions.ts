"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { timesheetWeeks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, allowedEmployeeIds } from "@/lib/access";

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

/** Attendance screen save — days/OT/rest-day/PH/MC/leave/allowance qty for
 *  one company/month/week, same fields as the full admin timesheet MINUS
 *  the monthly items (bonus/adjustment/reimbursement/deduction), which
 *  stay admin-only. Open to STAFF as well as ADMIN, but a restricted Staff
 *  login is narrowed back down to their assigned employees here — the
 *  hidden employeeIds field in the form is not trusted as-is. */
export async function saveAttendanceAction(formData: FormData) {
  const user = await requireUser();

  const companyId = String(formData.get("companyId") || "");
  const ym = String(formData.get("ym") || "");
  const weekIndex = Number(formData.get("weekIndex"));
  let employeeIds = String(formData.get("employeeIds") || "")
    .split(",")
    .filter(Boolean);
  const allowanceIds = String(formData.get("allowanceIds") || "")
    .split(",")
    .filter(Boolean);

  const allowed = await allowedEmployeeIds();
  if (allowed) employeeIds = employeeIds.filter((id) => allowed.has(id));

  if (!companyId || !ym || Number.isNaN(weekIndex) || !employeeIds.length) return;

  for (const employeeId of employeeIds) {
    const allowanceQty: Record<string, number> = {};
    for (const allowanceId of allowanceIds) {
      const q = numOrZero(formData.get(`qty_${employeeId}_${allowanceId}`));
      if (q) allowanceQty[allowanceId] = q;
    }

    const patch = {
      days: numOrNull(formData.get(`days_${employeeId}`)),
      ot: numOrZero(formData.get(`ot_${employeeId}`)),
      xot: numOrZero(formData.get(`xot_${employeeId}`)),
      rdS: numOrZero(formData.get(`rdS_${employeeId}`)),
      rdF: numOrZero(formData.get(`rdF_${employeeId}`)),
      ph: numOrZero(formData.get(`ph_${employeeId}`)),
      mc: numOrZero(formData.get(`mc_${employeeId}`)),
      pl: numOrZero(formData.get(`pl_${employeeId}`)),
      ul: numOrZero(formData.get(`ul_${employeeId}`)),
      allowanceQty,
      updatedByUserId: user.id,
      updatedAt: new Date(),
    };

    const existing = await db
      .select({ id: timesheetWeeks.id })
      .from(timesheetWeeks)
      .where(and(eq(timesheetWeeks.employeeId, employeeId), eq(timesheetWeeks.ym, ym), eq(timesheetWeeks.weekIndex, weekIndex)))
      .limit(1);

    if (existing.length) {
      await db.update(timesheetWeeks).set(patch).where(eq(timesheetWeeks.id, existing[0].id));
    } else {
      await db.insert(timesheetWeeks).values({ companyId, employeeId, ym, weekIndex, ...patch });
    }
  }

  revalidatePath("/attendance");
  revalidatePath("/leave");
  revalidatePath("/admin/timesheet");
  revalidatePath("/admin/payrun");
  revalidatePath("/admin");
}
