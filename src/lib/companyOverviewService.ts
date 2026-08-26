import "server-only";
import { getCompanies, getEmployees, getMonthPayroll } from "@/lib/payrollService";
import { getBudgetSummaryForMonth } from "@/lib/budgetService";
import { toOverviewRow, sumOverviewRows, type CompanyOverviewRow, type CompanyOverviewTotals } from "@/lib/companyOverview";

/** One row per company (payroll cost + budget income/expense combined),
 *  plus the total across all of them — the data behind the "All
 *  companies" cross-company dashboard. */
export async function getCompanyOverviewForMonth(ym: string): Promise<{ rows: CompanyOverviewRow[]; totals: CompanyOverviewTotals }> {
  const companies = await getCompanies();

  const rows = await Promise.all(
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

  return { rows, totals: sumOverviewRows(rows) };
}
