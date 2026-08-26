import { describe, it, expect } from "vitest";
import { summarizeBudgetMonth } from "./budget";
import type { BudgetCategory, BudgetEntry } from "@/db/schema";

const YM = "2026-07";

function mkCategory(overrides: Partial<BudgetCategory> & { id: string; type: "INCOME" | "EXPENSE" }): BudgetCategory {
  return {
    companyId: "co1",
    name: "Category",
    monthlyTarget: null,
    isSystem: false,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mkEntry(overrides: Partial<BudgetEntry> & { id: string; categoryId: string; amount: number }): BudgetEntry {
  return {
    companyId: "co1",
    ym: YM,
    description: "",
    source: "MANUAL",
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("summarizeBudgetMonth — budget-vs-actual aggregation", () => {
  it("sums multiple entries per category into one actual figure", () => {
    const categories = [mkCategory({ id: "marketing", type: "EXPENSE", name: "Marketing", monthlyTarget: 1000 })];
    const entries = [
      mkEntry({ id: "e1", categoryId: "marketing", amount: 400 }),
      mkEntry({ id: "e2", categoryId: "marketing", amount: 250 }),
    ];
    const summary = summarizeBudgetMonth(YM, categories, entries, 0);
    expect(summary.categories[0].actual).toBe(650);
    expect(summary.expense).toBe(650);
  });

  it("ignores stored entries for a system category and uses the live payroll figure instead", () => {
    const categories = [mkCategory({ id: "payroll", type: "EXPENSE", name: "Payroll", isSystem: true })];
    // Even if a stray entry somehow existed against this category, it must
    // never be double-counted — the system row's actual is payrollCost only.
    const entries = [mkEntry({ id: "e1", categoryId: "payroll", amount: 999999 })];
    const summary = summarizeBudgetMonth(YM, categories, entries, 12345);
    expect(summary.categories[0].actual).toBe(12345);
    expect(summary.expense).toBe(12345);
  });

  it("computes income, expense and net across mixed category types", () => {
    const categories = [
      mkCategory({ id: "sales", type: "INCOME", name: "Sales" }),
      mkCategory({ id: "payroll", type: "EXPENSE", name: "Payroll", isSystem: true }),
      mkCategory({ id: "rent", type: "EXPENSE", name: "Rent" }),
    ];
    const entries = [
      mkEntry({ id: "e1", categoryId: "sales", amount: 10000 }),
      mkEntry({ id: "e2", categoryId: "rent", amount: 1500 }),
    ];
    const summary = summarizeBudgetMonth(YM, categories, entries, 4000);
    expect(summary.income).toBe(10000);
    expect(summary.expense).toBe(4000 + 1500);
    expect(summary.net).toBe(10000 - 5500);
  });

  it("treats a category with no entries this month as zero, not missing", () => {
    const categories = [mkCategory({ id: "insurance", type: "EXPENSE", name: "Insurance", monthlyTarget: 200 })];
    const summary = summarizeBudgetMonth(YM, categories, [], 0);
    expect(summary.categories[0].actual).toBe(0);
    expect(summary.categories[0].target).toBe(200);
  });
});
