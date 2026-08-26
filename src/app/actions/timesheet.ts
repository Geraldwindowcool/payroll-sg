"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { timesheetWeeks, monthlyItems, employees } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";
import { weeksOfMonth } from "@/lib/payroll";
import {
  parseLeaveDaysField,
  replaceLeaveDaysForMonth,
} from "@/lib/saveLeaveDays";

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

/** Admin save for one employee's whole month — marked MC/leave dates, the
 *  per-week hours, and the month's bonus/adjustment/deduction items.
 *
 *  MC/leave day counts are always derived from the marked dates (see
 *  replaceLeaveDaysForMonth) rather than typed in directly, so the stored
 *  week totals and the calendar can never disagree with each other. */
export async function saveTimesheetMonthAction(formData: FormData) {
  const admin = await requireAdmin();

  const companyId = String(formData.get("companyId") || "");
  const employeeId = String(formData.get("employeeId") || "");
  const ym = String(formData.get("ym") || "");
  const allowanceIds = String(formData.get("allowanceIds") || "")
    .split(",")
    .filter(Boolean);

  if (!companyId || !employeeId || !/^\d{4}-\d{2}$/.test(ym)) return;

  // Read the work pattern from the employee record — it decides what each
  // marked date is worth, and must not be taken from the posted form.
  const [emp] = await db
    .select()
    .from(employees)
    .where(
      and(eq(employees.id, employeeId), eq(employees.companyId, companyId)),
    )
    .limit(1);
  if (!emp) return;

  const entries = parseLeaveDaysField(
    String(formData.get("leaveDays") || ""),
    ym,
  );
  await replaceLeaveDaysForMonth({
    companyId,
    employeeId,
    ym,
    pattern: emp.pattern,
    entries,
    userId: admin.id,
  });

  // mc/pl/ul are set by replaceLeaveDaysForMonth from the calendar, so they
  // are deliberately not written again here. One read for every week's row
  // up front, then every week's write fires together instead of each one
  // waiting in a queue behind the one before it.
  const weeks = weeksOfMonth(ym);
  const existingRows = await db
    .select({ id: timesheetWeeks.id, weekIndex: timesheetWeeks.weekIndex })
    .from(timesheetWeeks)
    .where(
      and(eq(timesheetWeeks.employeeId, employeeId), eq(timesheetWeeks.ym, ym)),
    );
  const existingByWeek = new Map(existingRows.map((r) => [r.weekIndex, r.id]));

  await Promise.all(
    weeks.map((w) => {
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
        updatedByUserId: admin.id,
        updatedAt: new Date(),
      };

      const existingId = existingByWeek.get(w.i);
      if (existingId) {
        return db
          .update(timesheetWeeks)
          .set(patch)
          .where(eq(timesheetWeeks.id, existingId));
      }
      return db
        .insert(timesheetWeeks)
        .values({ companyId, employeeId, ym, weekIndex: w.i, ...patch });
    }),
  );

  const itemPatch = {
    bonus: numOrZero(formData.get("bonus")),
    adj: numOrZero(formData.get("adj")),
    adjLbl: String(formData.get("adjLbl") || ""),
    reimb: numOrZero(formData.get("reimb")),
    reimbLbl: String(formData.get("reimbLbl") || ""),
    ded: numOrZero(formData.get("ded")),
    dedLbl: String(formData.get("dedLbl") || ""),
    note: String(formData.get("note") || ""),
    paid: formData.get("paid") === "on",
    updatedAt: new Date(),
  };

  const existingItem = await db
    .select({ id: monthlyItems.id })
    .from(monthlyItems)
    .where(
      and(eq(monthlyItems.employeeId, employeeId), eq(monthlyItems.ym, ym)),
    )
    .limit(1);

  if (existingItem.length) {
    await db
      .update(monthlyItems)
      .set(itemPatch)
      .where(eq(monthlyItems.id, existingItem[0].id));
  } else {
    await db
      .insert(monthlyItems)
      .values({ companyId, employeeId, ym, ...itemPatch });
  }

  revalidatePath("/admin/timesheet");
  revalidatePath("/admin/payrun");
  revalidatePath("/admin");
  revalidatePath("/attendance");
  revalidatePath("/leave");
}
