"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { allowances, employeeAllowances } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function num(fd: FormData, k: string, def = 0) {
  const n = parseFloat(String(fd.get(k) ?? ""));
  return Number.isFinite(n) ? n : def;
}

export async function createAllowanceAction(formData: FormData) {
  await requireAdmin();
  const companyId = s(formData, "companyId");
  const name = s(formData, "name");
  if (!companyId || !name) return;
  await db.insert(allowances).values({
    companyId,
    name,
    basis: (s(formData, "basis") || "DAY") as "DAY" | "HOUR" | "FIXED",
    rate: num(formData, "rate"),
    cpfPayable: formData.get("cpfPayable") === "on",
  });
  revalidatePath("/admin/allowances");
}

export async function updateAllowanceAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  await db
    .update(allowances)
    .set({
      name: s(formData, "name"),
      basis: (s(formData, "basis") || "DAY") as "DAY" | "HOUR" | "FIXED",
      rate: num(formData, "rate"),
      cpfPayable: formData.get("cpfPayable") === "on",
    })
    .where(eq(allowances.id, id));
  revalidatePath("/admin/allowances");
}

export async function deleteAllowanceAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  await db.delete(employeeAllowances).where(eq(employeeAllowances.allowanceId, id));
  await db.delete(allowances).where(eq(allowances.id, id));
  revalidatePath("/admin/allowances");
}
