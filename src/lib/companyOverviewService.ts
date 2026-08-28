import "server-only";
import { getCompanies, getEmployees, getMonthPayroll } from "@/lib/payrollService";
import { getBudgetSummaryForMonth } from "@/lib/budgetService";
import { toOverviewRow, sumOverviewRows, type CompanyOverviewRow, type CompanyOverviewTotals } from "@/lib/companyOverview";
import type { Company } from "@/db/schema";

async function getCompanyOverviewRowsForMonth(companies: Company[], ym: string): Promise<CompanyOverviewRow[]> {
  return Promise.all(
    companies.map(async (c) => {
      const [employees, payrollRows, budgetSummary] = await Promise.all([
        getEmployees(c.id, { activeOnly: true }),
        getMonthPayroll(c.id, ym),
        getBudgetSummaryForMonth(c.id, ym),
      ]);
      const payrollCost = payrollRows.reduce((s, r) => s + r.cost, 0);
      const hasPayrollCategory = budgetSummary.categories.some((cat) => cat.isSystem);

      return toOverviewRow({
        companyId: c.id,
        companyName: c.name,
        activeEmployees: employees.length,
        payrollCost,
        budgetIncome: budgetSummary.income,
        budgetExpense: budgetSummary.expense,
        hasPayrollCategory,
      });
    })
  );
}

/** One row per company (payroll cost + budget income/expense combined),
 *  plus the total across all of them — the data behind the "All
 *  companies" cross-company dashboard. */
export async function getCompanyOverviewForMonth(ym: string): Promise<{ rows: CompanyOverviewRow[]; totals: CompanyOverviewTotals }> {
  const companies = await getCompanies();
  const rows = await getCompanyOverviewRowsForMonth(companies, ym);
  return { rows, totals: sumOverviewRows(rows) };
}

export interface CompanyOverviewMonth {
  ym: string;
  income: number;
  expense: number;
  net: number;
}

/** The same cross-company combination as getCompanyOverviewForMonth, but
 *  for every month of a year — the data behind the trend chart. */
export async function getCompanyOverviewTrendForYear(year: number): Promise<CompanyOverviewMonth[]> {
  const companies = await getCompanies();
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

  return Promise.all(
    months.map(async (ym) => {
      const rows = await getCompanyOverviewRowsForMonth(companies, ym);
      const totals = sumOverviewRows(rows);
      return { ym, income: totals.income, expense: totals.payrollCost + totals.otherExpense, net: totals.netCashflow };
    })
  );
}
