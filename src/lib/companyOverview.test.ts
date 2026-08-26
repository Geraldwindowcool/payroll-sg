import { describe, it, expect } from "vitest";
import { toOverviewRow, sumOverviewRows, type CompanyFinancials } from "./companyOverview";

function mkFinancials(overrides: Partial<CompanyFinancials> = {}): CompanyFinancials {
  return {
    companyId: "co1",
    companyName: "Test Co",
    activeEmployees: 5,
    payrollCost: 10000,
    budgetIncome: 0,
    budgetExpense: 0,
    hasPayrollCategory: false,
    ...overrides,
  };
}

describe("toOverviewRow — combining payroll + budget per company", () => {
  it("counts payroll cost once when the company HAS a Payroll budget category (already folded into budgetExpense)", () => {
    const row = toOverviewRow(mkFinancials({ payrollCost: 10000, budgetIncome: 20000, budgetExpense: 15000, hasPayrollCategory: true }));
    expect(row.payrollCost).toBe(10000);
    expect(row.otherExpense).toBe(5000); // 15000 total expense - 10000 payroll
    expect(row.netCashflow).toBe(5000); // 20000 - 15000
  });

  it("adds payroll cost on top when the company has NO budget categories set up yet", () => {
    // budgetExpense is 0 here because there's no category to hold anything
    // — it must not be mistaken for "no expenses this month".
    const row = toOverviewRow(mkFinancials({ payrollCost: 10000, budgetIncome: 0, budgetExpense: 0, hasPayrollCategory: false }));
    expect(row.payrollCost).toBe(10000);
    expect(row.otherExpense).toBe(0);
    expect(row.netCashflow).toBe(-10000); // real payroll cost still counts against net, even though nothing else is tracked
  });

  it("never produces a negative otherExpense from the no-category case", () => {
    // A naive `budgetExpense - payrollCost` would give -10000 here — the
    // exact bug this function exists to avoid.
    const row = toOverviewRow(mkFinancials({ payrollCost: 10000, budgetExpense: 0, hasPayrollCategory: false }));
    expect(row.otherExpense).toBeGreaterThanOrEqual(0);
  });

  it("passes through employee count and identity fields untouched", () => {
    const row = toOverviewRow(mkFinancials({ companyId: "abc", companyName: "Acme", activeEmployees: 12 }));
    expect(row.companyId).toBe("abc");
    expect(row.companyName).toBe("Acme");
    expect(row.activeEmployees).toBe(12);
  });
});

describe("sumOverviewRows — combining every company into one total", () => {
  it("adds each numeric field across all companies", () => {
    const rows = [
      toOverviewRow(mkFinancials({ companyId: "a", activeEmployees: 5, payrollCost: 10000, budgetIncome: 20000, budgetExpense: 15000, hasPayrollCategory: true })),
      toOverviewRow(mkFinancials({ companyId: "b", activeEmployees: 3, payrollCost: 4000, budgetIncome: 0, budgetExpense: 0, hasPayrollCategory: false })),
    ];
    const totals = sumOverviewRows(rows);
    expect(totals.activeEmployees).toBe(8);
    expect(totals.payrollCost).toBe(14000);
    expect(totals.income).toBe(20000);
    expect(totals.otherExpense).toBe(5000);
    expect(totals.netCashflow).toBe(5000 + -4000); // company a's 5000 net + company b's -4000 net
  });

  it("returns all zeros for an empty company list", () => {
    expect(sumOverviewRows([])).toEqual({ activeEmployees: 0, payrollCost: 0, otherExpense: 0, income: 0, netCashflow: 0 });
  });
});
