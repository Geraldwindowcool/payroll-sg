"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { payrollCashAdjustments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function num(fd: FormData, k: string, def = 0) {
  const n = parseFloat(String(fd.get(k) ?? ""));
  return Number.isFinite(n) ? n : def;
}

const VALID_REASONS = ["DEFERRED_DRAW", "UNPAID_LEAVE_CPF", "COST_SHARE", "OTHER"] as const;

export async function createCashAdjustmentAction(formData: FormData) {
  const user = await requireAdmin();
  const companyId = s(formData, "companyId");
  const ym = s(formData, "ym");
  const note = s(formData, "note");
  // A note is mandatory — this ledger only means anything if every entry
  // is explained, since it's the record of why real cash differs from
  // what payroll shows as the accrued cost.
  if (!companyId || !ym || !note) return;
  const reasonRaw = s(formData, "reason");
  const reason = (VALID_REASONS as readonly string[]).includes(reasonRaw) ? (reasonRaw as (typeof VALID_REASONS)[number]) : "OTHER";
  const employeeId = s(formData, "employeeId") || null;

  await db.insert(payrollCashAdjustments).values({
    companyId,
    employeeId,
    ym,
    reason,
    amount: num(formData, "amount"),
    note,
    createdByUserId: user.id,
  });
  revalidatePath("/admin/budget");
}

export async function deleteCashAdjustmentAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  await db.delete(payrollCashAdjustments).where(eq(payrollCashAdjustments.id, id));
  revalidatePath("/admin/budget");
}
