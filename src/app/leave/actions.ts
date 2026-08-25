"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { timesheetWeeks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, allowedEmployeeIds } from "@/lib/access";

/**
 * Saves MC / paid leave / unpaid leave for a batch of employees, for one
 * company + month + week. This is intentionally the ONLY thing this action
 * touches — it never writes days/ot/xot/rdS/rdF/ph/allowanceQty, so a staff
 * member using this screen can never affect anything except leave, even
 * though the underlying row is shared with the full admin timesheet.
 */
export async function saveLeaveAction(formData: FormData) {
  const user = await requireUser(); // STAFF or ADMIN — both may key in leave

  const companyId = String(formData.get("companyId") || "");
  const ym = String(formData.get("ym") || "");
  const weekIndex = Number(formData.get("weekIndex"));
  let employeeIds = String(formData.get("employeeIds") || "")
    .split(",")
    .filter(Boolean);

  // The real access boundary — the hidden employeeIds field in the form is
  // just what the page happened to render, not something to trust as-is.
  // A restricted Staff login gets narrowed back down to their assigned
  // employees here even if the submitted list claimed more.
  const allowed = await allowedEmployeeIds();
  if (allowed) employeeIds = employeeIds.filter((id) => allowed.has(id));

  if (!companyId || !ym || Number.isNaN(weekIndex) || !employeeIds.length) return;

  for (const employeeId of employeeIds) {
    const mc = numOrZero(formData.get(`mc_${employeeId}`));
    const pl = numOrZero(formData.get(`pl_${employeeId}`));
    const ul = numOrZero(formData.get(`ul_${employeeId}`));

    const existing = await db
      .select({ id: timesheetWeeks.id })
      .from(timesheetWeeks)
      .where(and(eq(timesheetWeeks.employeeId, employeeId), eq(timesheetWeeks.ym, ym), eq(timesheetWeeks.weekIndex, weekIndex)))
      .limit(1);

    if (existing.length) {
      await db
        .update(timesheetWeeks)
        .set({ mc, pl, ul, updatedByUserId: user.id, updatedAt: new Date() })
        .where(eq(timesheetWeeks.id, existing[0].id));
    } else {
      await db.insert(timesheetWeeks).values({
        companyId,
        employeeId,
        ym,
        weekIndex,
        mc,
        pl,
        ul,
        updatedByUserId: user.id,
      });
    }
  }

  revalidatePath("/leave");
  revalidatePath("/admin/timesheet");
  revalidatePath("/admin/payrun");
  revalidatePath("/admin");
}

function numOrZero(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}
