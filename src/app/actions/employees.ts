"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { employees, employeeAllowances, timesheetWeeks, monthlyItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function num(fd: FormData, k: string, def = 0) {
  const n = parseFloat(String(fd.get(k) ?? ""));
  return Number.isFinite(n) ? n : def;
}
function numOrNull(fd: FormData, k: string) {
  const raw = String(fd.get(k) ?? "").trim();
  if (raw === "") return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}
function bool(fd: FormData, k: string) {
  const v = fd.get(k);
  return v === "on" || v === "true";
}

function employeeFields(formData: FormData) {
  return {
    name: s(formData, "name"),
    empNo: s(formData, "empNo"),
    dob: s(formData, "dob"),
    res: (s(formData, "res") || "FW") as "SC" | "PR" | "FW",
    prDate: s(formData, "prDate"),
    salary: num(formData, "salary"),
    pattern: num(formData, "pattern", 5),
    otElig: bool(formData, "otElig"),
    otMult: numOrNull(formData, "otMult"),
    levyId: s(formData, "levyId") || null,
    bankName: s(formData, "bankName"),
    bankCode: s(formData, "bankCode"),
    branchCode: s(formData, "branchCode"),
    acct: s(formData, "acct"),
    email: s(formData, "email"),
    cdacOn: bool(formData, "cdacOn"),
    cdacAmt: numOrNull(formData, "cdacAmt"),
    alEntitlement: num(formData, "alEntitlement", 14),
    mcEntitlement: num(formData, "mcEntitlement", 14),
  };
}

export async function createEmployeeAction(formData: FormData) {
  await requireAdmin();
  const companyId = s(formData, "companyId");
  const fields = employeeFields(formData);
  if (!companyId || !fields.name) return;
  const [created] = await db
    .insert(employees)
    .values({ companyId, ...fields })
    .returning();
  revalidatePath("/admin/employees");
  redirect(`/admin/employees/${created.id}`);
}

export async function updateEmployeeAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  const fields = employeeFields(formData);
  await db
    .update(employees)
    .set({ ...fields, active: bool(formData, "active"), updatedAt: new Date() })
    .where(eq(employees.id, id));
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${id}`);
}

/** Danger-zone permanent delete — wipes the employee's timesheets, monthly
 *  items and allowance links first since the schema doesn't use DB-level
 *  foreign keys. Prefer deactivating (via updateEmployeeAction) to keep
 *  payroll history intact; this is for genuine mistakes only. */
export async function deleteEmployeeAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  await db.delete(employeeAllowances).where(eq(employeeAllowances.employeeId, id));
  await db.delete(timesheetWeeks).where(eq(timesheetWeeks.employeeId, id));
  await db.delete(monthlyItems).where(eq(monthlyItems.employeeId, id));
  await db.delete(employees).where(eq(employees.id, id));
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

export async function setEmployeeAllowancesAction(formData: FormData) {
  await requireAdmin();
  const employeeId = s(formData, "employeeId");
  if (!employeeId) return;
  const allowanceIds = formData.getAll("allowanceIds").map(String);
  await db.delete(employeeAllowances).where(eq(employeeAllowances.employeeId, employeeId));
  for (const allowanceId of allowanceIds) {
    const rateOverride = numOrNull(formData, `rateOverride_${allowanceId}`);
    await db.insert(employeeAllowances).values({ employeeId, allowanceId, rateOverride });
  }
  revalidatePath(`/admin/employees/${employeeId}`);
}
