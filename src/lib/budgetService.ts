import "server-only";
import { db } from "@/db";
import { budgetCategories, budgetEntries, type BudgetCategory, type BudgetEntry } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getMonthPayroll } from "@/lib/payrollService";
import { summarizeBudgetMonth, type BudgetMonthSummary, type BudgetCategorySummary } from "@/lib/budget";

export { summarizeBudgetMonth, type BudgetMonthSummary, type BudgetCategorySummary };

/** The 8 expense categories Gerald confirmed as a sensible starting point,
 *  plus a "Sales & other income" category (so the dashboard's Income tile
 *  has somewhere to log against out of the box) and the system Payroll row
 *  seeded separately below. Seeded on demand — see seedDefaultBudgetCategories
 *  — never silently on page load. */
const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent & utilities",
  "Marketing",
  "Software & subscriptions",
  "Insurance",
  "Professional fees",
  "Vehicle & equipment",
  "Loan repayments",
  "Miscellaneous",
];

export async function getBudgetCategories(companyId: string): Promise<BudgetCategory[]> {
  const rows = await db.select().from(budgetCategories).where(eq(budgetCategories.companyId, companyId));
  return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function getBudgetEntriesForMonth(companyId: string, ym: string): Promise<BudgetEntry[]> {
  return db
    .select()
    .from(budgetEntries)
    .where(and(eq(budgetEntries.companyId, companyId), eq(budgetEntries.ym, ym)));
}

export async function getBudgetSummaryForMonth(companyId: string, ym: string): Promise<BudgetMonthSummary> {
  const [categories, entries, payrollRows] = await Promise.all([
    getBudgetCategories(companyId),
    getBudgetEntriesForMonth(companyId, ym),
    getMonthPayroll(companyId, ym, { includeInactive: true }),
  ]);
  const payrollCost = payrollRows.reduce((s, r) => s + r.cost, 0);
  return summarizeBudgetMonth(ym, categories, entries, payrollCost);
}

export interface BudgetYearMonthTotal {
  ym: string;
  income: number;
  expense: number;
  net: number;
}

export async function getBudgetSummaryForYear(companyId: string, year: number): Promise<BudgetYearMonthTotal[]> {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const summaries = await Promise.all(months.map((ym) => getBudgetSummaryForMonth(companyId, ym)));
  return summaries.map((s) => ({ ym: s.ym, income: s.income, expense: s.expense, net: s.net }));
}

/** Seeds the default categories once — a no-op if the company already has
 *  any (so a double-click, or visiting after someone else already set up
 *  categories, never duplicates rows). */
export async function seedDefaultBudgetCategories(companyId: string) {
  const existing = await getBudgetCategories(companyId);
  if (existing.length) return;

  let sortOrder = 0;
  await db.insert(budgetCategories).values([
    { companyId, name: "Sales & other income", type: "INCOME", sortOrder: sortOrder++ },
    { companyId, name: "Payroll", type: "EXPENSE", isSystem: true, sortOrder: sortOrder++ },
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ companyId, name, type: "EXPENSE" as const, sortOrder: sortOrder++ })),
  ]);
}
