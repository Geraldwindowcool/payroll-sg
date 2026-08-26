// Budget aggregation — pure functions, no I/O, same reasoning as
// src/lib/payroll.ts and src/lib/leave.ts: the arithmetic that decides
// what a category's "actual" figure is should be directly unit testable
// without a database.
import type { BudgetCategory, BudgetEntry } from "@/db/schema";

export interface BudgetCategorySummary {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  isSystem: boolean;
  target: number | null;
  actual: number;
}

export interface BudgetMonthSummary {
  ym: string;
  categories: BudgetCategorySummary[];
  income: number;
  expense: number;
  net: number;
}

/** A category flagged isSystem (only ever "Payroll") ignores any stored
 *  entries and always reports the given live payroll cost instead, so it
 *  can never drift out of sync with real payroll data. */
export function summarizeBudgetMonth(ym: string, categories: BudgetCategory[], entries: BudgetEntry[], payrollCost: number): BudgetMonthSummary {
  const entryTotals = new Map<string, number>();
  for (const e of entries) {
    entryTotals.set(e.categoryId, (entryTotals.get(e.categoryId) ?? 0) + e.amount);
  }

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const summaries: BudgetCategorySummary[] = sorted.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    isSystem: c.isSystem,
    target: c.monthlyTarget,
    actual: c.isSystem ? payrollCost : entryTotals.get(c.id) ?? 0,
  }));

  const income = summaries.filter((c) => c.type === "INCOME").reduce((s, c) => s + c.actual, 0);
  const expense = summaries.filter((c) => c.type === "EXPENSE").reduce((s, c) => s + c.actual, 0);

  return { ym, categories: summaries, income, expense, net: income - expense };
}
