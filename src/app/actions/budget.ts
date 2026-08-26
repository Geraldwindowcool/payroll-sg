"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { budgetCategories, budgetEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";
import { seedDefaultBudgetCategories } from "@/lib/budgetService";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function num(fd: FormData, k: string, def = 0) {
  const n = parseFloat(String(fd.get(k) ?? ""));
  return Number.isFinite(n) ? n : def;
}
function numOrNull(fd: FormData, k: string) {
  const raw = String(fd.get(k) ?? "").trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export async function seedDefaultCategoriesAction(formData: FormData) {
  await requireAdmin();
  const companyId = s(formData, "companyId");
  if (!companyId) return;
  await seedDefaultBudgetCategories(companyId);
  revalidatePath("/admin/budget");
  revalidatePath("/admin/budget/settings");
  revalidatePath("/admin/budget/entries");
}

export async function createBudgetCategoryAction(formData: FormData) {
  await requireAdmin();
  const companyId = s(formData, "companyId");
  const name = s(formData, "name");
  if (!companyId || !name) return;
  await db.insert(budgetCategories).values({
    companyId,
    name,
    type: (s(formData, "type") || "EXPENSE") as "INCOME" | "EXPENSE",
    monthlyTarget: numOrNull(formData, "monthlyTarget"),
  });
  revalidatePath("/admin/budget");
  revalidatePath("/admin/budget/settings");
  revalidatePath("/admin/budget/entries");
}

export async function updateBudgetCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  const isSystem = formData.get("isSystem") === "on";
  await db
    .update(budgetCategories)
    .set(
      isSystem
        ? { monthlyTarget: numOrNull(formData, "monthlyTarget") }
        : {
            name: s(formData, "name"),
            type: (s(formData, "type") || "EXPENSE") as "INCOME" | "EXPENSE",
            monthlyTarget: numOrNull(formData, "monthlyTarget"),
          }
    )
    .where(eq(budgetCategories.id, id));
  revalidatePath("/admin/budget");
  revalidatePath("/admin/budget/settings");
  revalidatePath("/admin/budget/entries");
}

export async function deleteBudgetCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  // The system Payroll category isn't deletable — its figure is load-bearing
  // for the dashboard's live payroll link. Guard here too, not just in the UI.
  const [cat] = await db.select().from(budgetCategories).where(eq(budgetCategories.id, id)).limit(1);
  if (!cat || cat.isSystem) return;
  await db.delete(budgetEntries).where(eq(budgetEntries.categoryId, id));
  await db.delete(budgetCategories).where(eq(budgetCategories.id, id));
  revalidatePath("/admin/budget");
  revalidatePath("/admin/budget/settings");
  revalidatePath("/admin/budget/entries");
}

export async function createBudgetEntryAction(formData: FormData) {
  const user = await requireAdmin();
  const companyId = s(formData, "companyId");
  const categoryId = s(formData, "categoryId");
  const ym = s(formData, "ym");
  if (!companyId || !categoryId || !ym) return;
  await db.insert(budgetEntries).values({
    companyId,
    categoryId,
    ym,
    amount: num(formData, "amount"),
    description: s(formData, "description"),
    updatedByUserId: user.id,
  });
  revalidatePath("/admin/budget");
  revalidatePath("/admin/budget/entries");
}

export async function updateBudgetEntryAction(formData: FormData) {
  const user = await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  await db
    .update(budgetEntries)
    .set({
      amount: num(formData, "amount"),
      description: s(formData, "description"),
      updatedByUserId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(budgetEntries.id, id));
  revalidatePath("/admin/budget");
  revalidatePath("/admin/budget/entries");
}

export async function deleteBudgetEntryAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  await db.delete(budgetEntries).where(eq(budgetEntries.id, id));
  revalidatePath("/admin/budget");
  revalidatePath("/admin/budget/entries");
}
