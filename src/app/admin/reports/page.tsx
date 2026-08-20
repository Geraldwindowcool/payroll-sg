import AppShell from "@/components/AppShell";
import { getActiveCompany } from "@/lib/activeCompany";
import { getMonthPayroll, getEmployees, getLeaveUsageForYear } from "@/lib/payrollService";
import { money } from "@/lib/payroll";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const year = Number(sp.year) || new Date().getFullYear();
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/reports">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  const employees = await getEmployees(company.id);
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const monthRows = await Promise.all(months.map((ym) => getMonthPayroll(company.id, ym, { includeInactive: true })));
  const leaveUsage = await getLeaveUsageForYear(company.id, year);

  const perEmployee = new Map<string, { name: string; gross: number; net: number; cost: number; cpfEr: number; sdl: number }>();
  const monthlyTotals = months.map((ym, i) => {
    const rows = monthRows[i];
    const t = rows.reduce((s, r) => ({ gross: s.gross + r.gross, net: s.net + r.net, cost: s.cost + r.cost }), { gross: 0, net: 0, cost: 0 });
    for (const r of rows) {
      const cur = perEmployee.get(r.emp.id) ?? { name: r.emp.name, gross: 0, net: 0, cost: 0, cpfEr: 0, sdl: 0 };
      cur.gross += r.gross;
      cur.net += r.net;
      cur.cost += r.cost;
      cur.cpfEr += r.cpf.er;
      cur.sdl += r.sdl;
      perEmployee.set(r.emp.id, cur);
    }
    return { ym, ...t };
  });

  const yearTotal = monthlyTotals.reduce((s, m) => ({ gross: s.gross + m.gross, net: s.net + m.net, cost: s.cost + m.cost }), { gross: 0, net: 0, cost: 0 });

  return (
    <AppShell active="/admin/reports">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Reports</h1>
          <div className="sub">{year} yearly summary.</div>
        </div>
        <div className="actions">
          <form method="get" className="flex items-center gap-2">
            <input className="inp" type="number" name="year" defaultValue={year} style={{ width: 100 }} />
            <button className="btn sm" type="submit">Go</button>
          </form>
          <a className="btn" href={`/admin/reports/export?year=${year}&companyId=${company.id}`}>Download CSV</a>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card">
          <div className="hd"><h2>By month</h2></div>
          <div className="tw">
            <table>
              <thead><tr><th>Month</th><th className="n">Gross</th><th className="n">Net</th><th className="n">Cost to company</th></tr></thead>
              <tbody>
                {monthlyTotals.map((m) => (
                  <tr key={m.ym}><td>{m.ym}</td><td className="n">{money(m.gross)}</td><td className="n">{money(m.net)}</td><td className="n">{money(m.cost)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td>Total {year}</td><td className="n">{money(yearTotal.gross)}</td><td className="n">{money(yearTotal.net)}</td><td className="n">{money(yearTotal.cost)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>By employee — {year} to date</h2></div>
          <div className="tw">
            <table>
              <thead><tr><th>Employee</th><th className="n">Gross YTD</th><th className="n">Net YTD</th><th className="n">Cost YTD</th><th className="n">MC taken</th><th className="n">Leave taken</th></tr></thead>
              <tbody>
                {employees.length ? employees.map((e) => {
                  const agg = perEmployee.get(e.id) ?? { name: e.name, gross: 0, net: 0, cost: 0, cpfEr: 0, sdl: 0 };
                  const used = leaveUsage.get(e.id) ?? { mc: 0, pl: 0, ul: 0 };
                  return (
                    <tr key={e.id}>
                      <td>{e.name}</td>
                      <td className="n">{money(agg.gross)}</td>
                      <td className="n">{money(agg.net)}</td>
                      <td className="n">{money(agg.cost)}</td>
                      <td className="n">{used.mc} / {e.mcEntitlement}</td>
                      <td className="n">{used.pl} / {e.alEntitlement}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="empty">No employees yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
