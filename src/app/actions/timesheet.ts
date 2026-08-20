"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { timesheetWeeks, monthlyItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";

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

/** Full admin timesheet save — one company/month/week, every employee,
 *  every field (unlike the staff-only saveLeaveAction, which only ever
 *  touches mc/pl/ul). Allowance quantities are posted as qty_<empId>_<allowanceId>. */
export async function saveTimesheetWeekAction(formData: FormData) {
  const admin = await requireAdmin();

  const companyId = String(formData.get("companyId") || "");
  const ym = String(formData.get("ym") || "");
  const weekIndex = Number(formData.get("weekIndex"));
  const employeeIds = String(formData.get("employeeIds") || "")
    .split(",")
    .filter(Boolean);
  const allowanceIds = String(formData.get("allowanceIds") || "")
    .split(",")
    .filter(Boolean);

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
      updatedByUserId: admin.id,
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

  revalidatePath("/admin/timesheet");
  revalidatePath("/admin/payrun");
  revalidatePath("/admin");
  revalidatePath("/leave");
}

export async function saveMonthlyItemsAction(formData: FormData) {
  await requireAdmin();

  const companyId = String(formData.get("companyId") || "");
  const ym = String(formData.get("ym") || "");
  const employeeIds = String(formData.get("employeeIds") || "")
    .split(",")
    .filter(Boolean);
  if (!companyId || !ym || !employeeIds.length) return;

  for (const employeeId of employeeIds) {
    const patch = {
      bonus: numOrZero(formData.get(`bonus_${employeeId}`)),
      adj: numOrZero(formData.get(`adj_${employeeId}`)),
      adjLbl: String(formData.get(`adjLbl_${employeeId}`) || ""),
      reimb: numOrZero(formData.get(`reimb_${employeeId}`)),
      reimbLbl: String(formData.get(`reimbLbl_${employeeId}`) || ""),
      ded: numOrZero(formData.get(`ded_${employeeId}`)),
      dedLbl: String(formData.get(`dedLbl_${employeeId}`) || ""),
      note: String(formData.get(`note_${employeeId}`) || ""),
      paid: formData.get(`paid_${employeeId}`) === "on",
      updatedAt: new Date(),
    };

    const existing = await db
      .select({ id: monthlyItems.id })
      .from(monthlyItems)
      .where(and(eq(monthlyItems.employeeId, employeeId), eq(monthlyItems.ym, ym)))
      .limit(1);

    if (existing.length) {
      await db.update(monthlyItems).set(patch).where(eq(monthlyItems.id, existing[0].id));
    } else {
      await db.insert(monthlyItems).values({ companyId, employeeId, ym, ...patch });
    }
  }

  revalidatePath("/admin/timesheet");
  revalidatePath("/admin/payrun");
  revalidatePath("/admin");
}
