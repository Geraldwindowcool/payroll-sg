"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, requireUser } from "@/lib/access";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/activeCompany";

export async function switchCompanyAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("companyId") || "");
  if (!id) return;
  const jar = await cookies();
  jar.set(ACTIVE_COMPANY_COOKIE, id, { path: "/", httpOnly: false, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function addCompanyAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const [created] = await db.insert(companies).values({ name }).returning();
  const jar = await cookies();
  jar.set(ACTIVE_COMPANY_COOKIE, created.id, { path: "/", httpOnly: false, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function deleteCompanyAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("companyId") || "");
  const all = await db.select().from(companies);
  if (all.length <= 1) return; // always keep at least one company
  await db.delete(companies).where(eq(companies.id, id));
  const jar = await cookies();
  const remaining = all.find((c) => c.id !== id);
  if (remaining) jar.set(ACTIVE_COMPANY_COOKIE, remaining.id, { path: "/", httpOnly: false, sameSite: "lax" });
  revalidatePath("/", "layout");
}
