"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companies, DEFAULT_CPF, BANK_FIELD_OPTIONS } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";
import type { CpfConfig } from "@/lib/payroll";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function num(fd: FormData, k: string, def = 0) {
  const n = parseFloat(String(fd.get(k) ?? ""));
  return Number.isFinite(n) ? n : def;
}

export async function updateCompanyAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  await db
    .update(companies)
    .set({
      name: s(formData, "name"),
      uen: s(formData, "uen"),
      acct: s(formData, "acct"),
      bank: s(formData, "bank"),
      ref: s(formData, "ref"),
      hoursPerWeek: num(formData, "hoursPerWeek", 44),
      otMult: num(formData, "otMult", 1.5),
      sdlEnabled: formData.get("sdlEnabled") === "on",
      roundNet: formData.get("roundNet") === "on",
      updatedAt: new Date(),
    })
    .where(eq(companies.id, id));
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}

/** Rewrites the company's CPF rate table. Bands (age brackets) are fixed to
 *  the standard MOM/CPF Board structure; only the ceilings and the
 *  total/employee-share percentages per band are editable. */
export async function updateCpfAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;

  const cpf = structuredClone(DEFAULT_CPF) as unknown as CpfConfig;
  cpf.owCeiling = num(formData, "owCeiling", cpf.owCeiling);
  cpf.annualCeiling = num(formData, "annualCeiling", cpf.annualCeiling);
  cpf.minWage = num(formData, "minWage", cpf.minWage);
  cpf.lowBand = num(formData, "lowBand", cpf.lowBand);
  cpf.fullBand = num(formData, "fullBand", cpf.fullBand);

  const rates: Record<string, Record<string, [number, number]>> = { full: {}, pr1: {}, pr2: {} };
  for (const scheme of ["full", "pr1", "pr2"] as const) {
    for (const band of cpf.bands) {
      const total = num(formData, `cpf_${scheme}_${band.id}_total`, 0);
      const ee = num(formData, `cpf_${scheme}_${band.id}_ee`, 0);
      rates[scheme][band.id] = [total, ee];
    }
  }
  cpf.rates = rates;

  await db
    .update(companies)
    .set({ cpf: cpf as unknown as typeof DEFAULT_CPF, updatedAt: new Date() })
    .where(eq(companies.id, id));
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}

/** Rewrites which columns the bank file export includes, what each is
 *  labeled, and what order they come in — so the CSV can be lined up
 *  exactly with whatever your bank's bulk-upload template expects,
 *  without needing a code change every time a detail differs. */
export async function updateBankColsAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;

  const cols = BANK_FIELD_OPTIONS.map((opt) => ({
    f: opt.f,
    head: s(formData, `head_${opt.f}`) || opt.defaultHead,
    on: formData.get(`on_${opt.f}`) === "on",
    order: num(formData, `order_${opt.f}`, 999),
  }))
    .sort((a, b) => a.order - b.order)
    .map(({ f, head, on }) => ({ f, head, on }));

  await db.update(companies).set({ bankCols: cols, updatedAt: new Date() }).where(eq(companies.id, id));
  revalidatePath("/admin/settings");
  revalidatePath("/admin/bank");
}
