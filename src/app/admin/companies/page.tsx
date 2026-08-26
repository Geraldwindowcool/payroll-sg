import AppShell from "@/components/AppShell";
import { getCompanyOverviewForMonth } from "@/lib/companyOverviewService";
import { money, money0 } from "@/lib/payroll";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The cross-company view — combined payroll + budget performance across
 *  every company on the account, for whoever wants the whole-business
 *  picture instead of switching between companies one at a time. */
export default async function CompaniesOverviewPage() {
  const ym = thisMonth();
  const { rows, totals } = await getCompanyOverviewForMonth(ym);

  if (!rows.length) {
    return (
      <AppShell active="/admin/companies">
        <div className="note warn">No companies yet — add one from Settings first.</div>
      </AppShell>
    );
  }

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
