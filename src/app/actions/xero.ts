"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/db";
import { budgetEntries, budgetCategories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";
import { disconnectXero, getXeroFinancialsForRange, saveXeroConnection, type XeroTenant, type PendingXeroTokens } from "@/lib/xero";

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

/** Finishes a connection that came back with more than one reachable Xero
 *  organisation — see the callback route's comment for why that happens.
 *  Reads the token pair stashed there by the callback, applies it to
 *  whichever organisation the admin actually picked, and forgets the
 *  pending cookie either way (picking wrong just means clicking Connect
 *  again — nothing destructive happened yet). */
export async function chooseXeroTenantAction(formData: FormData) {
  await requireAdmin();
  const jar = await cookies();
  const raw = jar.get("xero_pending")?.value;
  jar.delete("xero_pending");
  if (!raw) redirect("/admin/settings?xeroError=That+connection+attempt+expired+%E2%80%94+try+Connect+to+Xero+again.");

  let pending: { companyId: string; tokens: PendingXeroTokens; tenants: XeroTenant[] };
  try {
    pending = JSON.parse(raw);
  } catch {
    redirect("/admin/settings?xeroError=That+connection+attempt+expired+%E2%80%94+try+Connect+to+Xero+again.");
  }

  const companyId = s(formData, "companyId");
  const tenantId = s(formData, "tenantId");
  if (companyId !== pending.companyId) redirect("/admin/settings?xeroError=That+connection+attempt+was+for+a+different+company+%E2%80%94+try+Connect+to+Xero+again.");
  const tenant = pending.tenants.find((t) => t.tenantId === tenantId);
  if (!tenant) redirect("/admin/settings?xeroError=Unrecognised+organisation+%E2%80%94+try+Connect+to+Xero+again.");

  await saveXeroConnection(companyId, tenant, { ...pending.tokens, expiresAt: new Date(pending.tokens.expiresAt) });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/budget");
  redirect(`/admin/settings?xeroConnected=${encodeURIComponent(tenant.tenantName)}`);
}

/** The "Sync from Xero" button on the Budget dashboard. Pulls that
 *  month's income and expenses from the connected Xero organisation's P&L
 *  report in one call, then writes whichever figure matches the chosen
 *  category's type into a single, dedicated entry (source: XERO) — re-
 *  clicking updates that same entry rather than piling up duplicates, and
 *  never touches any manually-entered rows. The system Payroll category
 *  is excluded here (and in the dashboard's dropdown) since its actual
 *  always comes from real payroll data, not a generic Xero total. */
export async function refreshRevenueFromXeroAction(formData: FormData) {
  const user = await requireAdmin();
  const companyId = s(formData, "companyId");
  const categoryId = s(formData, "categoryId");
  const ym = s(formData, "ym");
  if (!companyId || !categoryId || !ym) redirect("/admin/budget?xeroError=Missing+information.");

  const [category] = await db.select().from(budgetCategories).where(eq(budgetCategories.id, categoryId)).limit(1);
  if (!category) redirect("/admin/budget?xeroError=That+category+no+longer+exists.");
  if (category.isSystem) redirect("/admin/budget?xeroError=Payroll%27s+figure+always+comes+from+real+payroll+data%2C+not+Xero.");

  const [year, month] = ym.split("-").map(Number);
  const startDate = `${ym}-01`;
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const endDate = isCurrentMonth ? today.toISOString().slice(0, 10) : `${ym}-${String(lastDayOfMonth).padStart(2, "0")}`;

  let result: { income: number; expenses: number; tenantName: string };
  try {
    result = await getXeroFinancialsForRange(companyId, startDate, endDate);
  } catch (e) {
    redirect(`/admin/budget?xeroError=${encodeURIComponent(e instanceof Error ? e.message : "Xero request failed.")}`);
  }
  const amount = category.type === "INCOME" ? result.income : result.expenses;

  const [existing] = await db
    .select()
    .from(budgetEntries)
    .where(and(eq(budgetEntries.companyId, companyId), eq(budgetEntries.categoryId, categoryId), eq(budgetEntries.ym, ym), eq(budgetEntries.source, "XERO")))
    .limit(1);

  const description = `Synced from Xero (${result.tenantName})`;
  if (existing) {
    await db.update(budgetEntries).set({ amount, description, updatedByUserId: user.id, updatedAt: new Date() }).where(eq(budgetEntries.id, existing.id));
  } else {
    await db.insert(budgetEntries).values({ companyId, categoryId, ym, amount, description, source: "XERO", updatedByUserId: user.id });
  }

  revalidatePath("/admin/budget");
  revalidatePath("/admin/budget/entries");
  redirect(`/admin/budget?xeroSynced=${amount}`);
}
