import AppShell from "@/components/AppShell";
import { getCompanyOverviewForMonth, getCompanyOverviewTrendForYear } from "@/lib/companyOverviewService";
import { IncomeExpenseByCompanyChart, NetCashflowByCompanyChart, IncomeExpenseTrendChart } from "@/components/CompanyCharts";
import { money, money0 } from "@/lib/payroll";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The cross-company view — combined payroll + budget performance across
 *  every company on the account, for whoever wants the whole-business
 *  picture instead of switching between companies one at a time. */
export default async function CompaniesOverviewPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const ym = thisMonth();
  const year = Number(sp.year) || new Date().getFullYear();
  const [{ rows, totals }, trend] = await Promise.all([
    getCompanyOverviewForMonth(ym),
    getCompanyOverviewTrendForYear(year),
  ]);

  if (!rows.length) {
    return (
      <AppShell active="/admin/companies">
        <div className="note warn">No companies yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  // Plain, computed callouts — not editorial, just the two facts most
  // likely to answer "where should we look first".
  const worst = [...rows].sort((a, b) => a.netCashflow - b.netCashflow)[0];
  const totalCost = totals.payrollCost + totals.otherExpense;
  const payrollShare = totalCost > 0 ? Math.round((totals.payrollCost / totalCost) * 100) : 0;

  return (
    <AppShell active="/admin/companies">
      <div className="page-head">
        <div>
          <div className="eyebrow">All companies — {new Date(ym + "-01").toLocaleString("en-SG", { month: "long", year: "numeric" })}</div>
          <h1>Everyone, at a glance.</h1>
        </div>
      </div>

      <div className="stack-lg">
        <div className="stats">
          <div className="stat accent">
            <div className="k">Combined net cashflow</div>
            <div className="v" style={{ color: totals.netCashflow >= 0 ? "var(--good)" : "var(--bad)" }}>{money0(totals.netCashflow)}</div>
            <div className="m">across {rows.length} {rows.length === 1 ? "company" : "companies"}</div>
          </div>
          <Stat k="Total income" v={money0(totals.income)} m={ym} />
          <Stat k="Total payroll cost" v={money0(totals.payrollCost)} m={`${totals.activeEmployees} active employees`} />
          <Stat k="Total other expenses" v={money0(totals.otherExpense)} m="excl. payroll" />
        </div>

        {rows.length > 1 && (
          <div className="note info">
            <strong>Where to look first:</strong> {worst.companyName} has the lowest net cashflow this month ({money(worst.netCashflow)}).
            {" "}Payroll makes up {payrollShare}% of total costs across every company combined.
          </div>
        )}

        <div className="card">
          <div className="hd"><h2>Income vs. expenses by company — {ym}</h2></div>
          <div className="bd">
            <IncomeExpenseByCompanyChart rows={rows.map((r) => ({ label: r.companyName, income: r.income, expense: r.payrollCost + r.otherExpense }))} />
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>Net cashflow by company — {ym}</h2></div>
          <div className="bd">
            <NetCashflowByCompanyChart rows={rows.map((r) => ({ label: r.companyName, value: r.netCashflow }))} />
          </div>
        </div>

        <div className="card">
          <div className="hd">
            <h2>Combined trend — {year}</h2>
            <form method="get" className="flex items-center gap-2">
              <input className="inp" type="number" name="year" defaultValue={year} style={{ width: 100 }} />
              <button className="btn sm" type="submit">Go</button>
            </form>
          </div>
          <div className="bd">
            <IncomeExpenseTrendChart months={trend} />
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>By company — {ym}</h2></div>
          <div className="tw">
            <table>
              <thead>
                <tr><th>Company</th><th className="n">Employees</th><th className="n">Income</th><th className="n">Payroll cost</th><th className="n">Other expenses</th><th className="n">Net cashflow</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.companyId}>
                    <td>{r.companyName}</td>
                    <td className="n">{r.activeEmployees}</td>
                    <td className="n">{money(r.income)}</td>
                    <td className="n">{money(r.payrollCost)}</td>
                    <td className="n">{money(r.otherExpense)}</td>
                    <td className="n">{money(r.netCashflow)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="n">{totals.activeEmployees}</td>
                  <td className="n">{money(totals.income)}</td>
                  <td className="n">{money(totals.payrollCost)}</td>
                  <td className="n">{money(totals.otherExpense)}</td>
                  <td className="n">{money(totals.netCashflow)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="bd">
            <p className="hint">Switch companies from the picker at the top to see any one of these in full detail, on its own Payroll or Budget pages.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ k, v, m }: { k: string; v: string; m: string }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      <div className="m">{m}</div>
    </div>
  );
}
