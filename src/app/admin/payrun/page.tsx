import AppShell from "@/components/AppShell";
import Link from "next/link";
import { getActiveCompany } from "@/lib/activeCompany";
import { getMonthPayroll } from "@/lib/payrollService";
import { money, money0 } from "@/lib/payroll";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PayRunPage({ searchParams }: { searchParams: Promise<{ ym?: string }> }) {
  const sp = await searchParams;
  const ym = sp.ym || thisMonth();
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/payrun">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  const rows = await getMonthPayroll(company.id, ym);
  rows.sort((a, b) => a.emp.name.localeCompare(b.emp.name));

  const totals = rows.reduce(
    (t, r) => ({ gross: t.gross + r.gross, cpfEe: t.cpfEe + r.cpf.ee, cpfEr: t.cpfEr + r.cpf.er, sdl: t.sdl + r.sdl, levy: t.levy + r.levy, net: t.net + r.net, cost: t.cost + r.cost }),
    { gross: 0, cpfEe: 0, cpfEr: 0, sdl: 0, levy: 0, net: 0, cost: 0 }
  );

  return (
    <AppShell active="/admin/payrun">
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26 }}>Pay run</h1>
          <span className="hint">{company.name} — review before you pay out.</span>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input className="inp" type="month" name="ym" defaultValue={ym} style={{ width: 160 }} />
          <button className="btn sm" type="submit">Go</button>
        </form>
      </div>

      {!rows.length ? (
        <div className="note warn">No active employees, or no data for {ym} yet.</div>
      ) : (
        <div className="card">
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th className="n">Gross</th>
                  <th className="n">CPF (EE)</th>
                  <th className="n">CPF (ER)</th>
                  <th className="n">SDL</th>
                  <th className="n">Levy</th>
                  <th className="n">Net pay</th>
                  <th className="n">Cost to co.</th>
                  <th>Flags</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const flags: string[] = [];
                  if (r.otHrs + r.xotHrs > 72) flags.push("OT > 72h");
                  if (r.incomplete) flags.push("Incomplete month");
                  if (r.leaveOver) flags.push("Leave exceeds week");
                  if (r.dedWarn) flags.push("Deductions > 50%");
                  if (r.cpf.owCapped) flags.push("OW capped");
                  if (r.cpf.awCapped) flags.push("AW capped");
                  if (!r.empRow.acct) flags.push("No bank account");
                  return (
                    <tr key={r.emp.id}>
                      <td className="strong">{r.emp.name}</td>
                      <td className="n">{money(r.gross)}</td>
                      <td className="n">{money(r.cpf.ee)}</td>
                      <td className="n">{money(r.cpf.er)}</td>
                      <td className="n">{money(r.sdl)}</td>
                      <td className="n">{money(r.levy)}</td>
                      <td className="n strong">{money(r.net)}</td>
                      <td className="n">{money(r.cost)}</td>
                      <td>{flags.map((f) => <span key={f} className="pill amber" style={{ marginRight: 4, marginBottom: 2 }}>{f}</span>)}</td>
                      <td><Link href={`/admin/payslips?ym=${ym}&emp=${r.emp.id}`} className="btn sm">Explain</Link></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total ({rows.length})</td>
                  <td className="n">{money(totals.gross)}</td>
                  <td className="n">{money(totals.cpfEe)}</td>
                  <td className="n">{money(totals.cpfEr)}</td>
                  <td className="n">{money(totals.sdl)}</td>
                  <td className="n">{money(totals.levy)}</td>
                  <td className="n">{money(totals.net)}</td>
                  <td className="n">{money(totals.cost)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="bd flex items-center gap-3" style={{ borderTop: "1px solid var(--line)" }}>
            <Link href={`/admin/payslips?ym=${ym}`} className="btn">Print all payslips</Link>
            <Link href={`/admin/bank?ym=${ym}`} className="btn">Bank file</Link>
            <span className="hint">Total cost to company this month: <b>{money0(totals.cost)}</b></span>
          </div>
        </div>
      )}
    </AppShell>
  );
}
