// Combining each company's payroll + budget numbers into one cross-company
// row — pure functions, no I/O, same reasoning as src/lib/payroll.ts and
// src/lib/budget.ts.
//
// The one wrinkle: a company that hasn't set up budget categories yet has
// no "Payroll" system category, so its budget summary's expense total
// doesn't include payroll cost at all (there's nothing to hold it). A
// company that HAS set up categories already folds real payroll cost into
// its expense total via that system category. `hasPayrollCategory` tells
// toOverviewRow which situation it's looking at, so payroll cost is
// counted exactly once either way — not double-counted, and not missing.

export interface CompanyFinancials {
  companyId: string;
  companyName: string;
  activeEmployees: number;
  payrollCost: number;
  budgetIncome: number;
  budgetExpense: number;
  hasPayrollCategory: boolean;
}

export interface CompanyOverviewRow {
  companyId: string;
  companyName: string;
  activeEmployees: number;
  payrollCost: number;
  otherExpense: number;
  income: number;
  netCashflow: number;
}

export function toOverviewRow(f: CompanyFinancials): CompanyOverviewRow {
  const totalExpense = f.hasPayrollCategory ? f.budgetExpense : f.budgetExpense + f.payrollCost;
  return {
    companyId: f.companyId,
    companyName: f.companyName,
    activeEmployees: f.activeEmployees,
    payrollCost: f.payrollCost,
    otherExpense: totalExpense - f.payrollCost,
    income: f.budgetIncome,
    netCashflow: f.budgetIncome - totalExpense,
  };
}

export interface CompanyOverviewTotals {
  activeEmployees: number;
  payrollCost: number;
  otherExpense: number;
  income: number;
  netCashflow: number;
}

export function sumOverviewRows(rows: CompanyOverviewRow[]): CompanyOverviewTotals {
  return rows.reduce(
    (acc, r) => ({
      activeEmployees: acc.activeEmployees + r.activeEmployees,
      payrollCost: acc.payrollCost + r.payrollCost,
      otherExpense: acc.otherExpense + r.otherExpense,
      income: acc.income + r.income,
      netCashflow: acc.netCashflow + r.netCashflow,
    }),
    { activeEmployees: 0, payrollCost: 0, otherExpense: 0, income: 0, netCashflow: 0 }
  );
}
