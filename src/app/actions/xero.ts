"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { budgetEntries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";
import { disconnectXero, getXeroRevenueForRange } from "@/lib/xero";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

export async function disconnectXeroAction(formData: FormData) {
  await requireAdmin();
  const companyId = s(formData, "companyId");
  if (!companyId) return;
  await disconnectXero(companyId);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/budget");
}

/** The "Refresh from Xero" button on the Budget dashboard. Pulls that
 *  month's revenue from the connected Xero organisation's P&L report and
 *  writes it into a single, dedicated entry (source: XERO) in the chosen
 *  income category — re-clicking updates that same entry rather than
 *  piling up duplicates, and never touches any manually-entered rows. */
export async function refreshRevenueFromXeroAction(formData: FormData) {
  const user = await requireAdmin();
  const companyId = s(formData, "companyId");
  const categoryId = s(formData, "categoryId");
  const ym = s(formData, "ym");
  if (!companyId || !categoryId || !ym) redirect("/admin/budget?xeroError=Missing+information.");

  const [year, month] = ym.split("-").map(Number);
  const startDate = `${ym}-01`;
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const endDate = isCurrentMonth ? today.toISOString().slice(0, 10) : `${ym}-${String(lastDayOfMonth).padStart(2, "0")}`;

  let result: { revenue: number; tenantName: string };
  try {
    result = await getXeroRevenueForRange(companyId, startDate, endDate);
  } catch (e) {
    redirect(`/admin/budget?xeroError=${encodeURIComponent(e instanceof Error ? e.message : "Xero request failed.")}`);
  }

  const [existing] = await db
    .select()
    .from(budgetEntries)
    .where(and(eq(budgetEntries.companyId, companyId), eq(budgetEntries.categoryId, categoryId), eq(budgetEntries.ym, ym), eq(budgetEntries.source, "XERO")))
    .limit(1);

  const description = `Synced from Xero (${result.tenantName})`;
  if (existing) {
    await db.update(budgetEntries).set({ amount: result.revenue, description, updatedByUserId: user.id, updatedAt: new Date() }).where(eq(budgetEntries.id, existing.id));
  } else {
    await db.insert(budgetEntries).values({ companyId, categoryId, ym, amount: result.revenue, description, source: "XERO", updatedByUserId: user.id });
  }

  revalidatePath("/admin/budget");
  revalidatePath("/admin/budget/entries");
  redirect(`/admin/budget?xeroSynced=${result.revenue}`);
}
