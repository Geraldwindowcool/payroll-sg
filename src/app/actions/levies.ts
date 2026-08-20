"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { levies, employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function num(fd: FormData, k: string, def = 0) {
  const n = parseFloat(String(fd.get(k) ?? ""));
  return Number.isFinite(n) ? n : def;
}

export async function createLevyAction(formData: FormData) {
  await requireAdmin();
  const companyId = s(formData, "companyId");
  const label = s(formData, "label");
  if (!companyId || !label) return;
  await db.insert(levies).values({ companyId, label, amt: num(formData, "amt") });
  revalidatePath("/admin/settings");
}

export async function updateLevyAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  await db.update(levies).set({ label: s(formData, "label"), amt: num(formData, "amt") }).where(eq(levies.id, id));
  revalidatePath("/admin/settings");
}

export async function deleteLevyAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  await db.update(employees).set({ levyId: null }).where(eq(employees.levyId, id));
  await db.delete(levies).where(eq(levies.id, id));
  revalidatePath("/admin/settings");
}
