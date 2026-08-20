import AppShell from "@/components/AppShell";
import PrintButton from "@/components/PrintButton";
import { getActiveCompany } from "@/lib/activeCompany";
import { getMonthPayroll } from "@/lib/payrollService";
import { money } from "@/lib/payroll";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PayslipsPage({ searchParams }: { searchParams: Promise<{ ym?: string; emp?: string }> }) {
  const sp = await searchParams;
  const ym = sp.ym || thisMonth();
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/payslips">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  let rows = await getMonthPayroll(company.id, ym);
  if (sp.emp) rows = rows.filter((r) => r.emp.id === sp.emp);
  rows.sort((a, b) => a.emp.name.localeCompare(b.emp.name));

  return (
    <AppShell active="/admin/payslips">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26 }}>Payslips</h1>
          <span className="hint">{company.name} — {ym}</span>
        </div>
        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <input className="inp" type="month" name="ym" defaultValue={ym} style={{ width: 160 }} />
            <button className="btn sm" type="submit">Go</button>
          </form>
          <PrintButton />
        </div>
      </div>

      {!rows.length ? (
        <div className="note warn">Nothing to show for {ym}.</div>
      ) : (
        rows.map((r) => (
          <div key={r.emp.id} className="card" style={{ marginBottom: 16, pageBreakAfter: "always" }}>
            <div className="hd">
              <div>
                <h2 style={{ fontSize: 18 }}>{company.name}</h2>
                <span className="hint">UEN {company.uen || "—"}</span>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div className="strong">{r.emp.name}</div>
                <span className="hint">{r.empRow.empNo} · Payslip for {ym}</span>
              </div>
            </div>
            <div className="bd">
              <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-3)", marginBottom: 8 }}>Payments</h3>
                  <table>
                    <tbody>
                      <tr><td>Basic pay ({r.daysWorked}/{r.stdDays} days)</td><td className="n">{money(r.basic)}</td></tr>
                      {r.ot > 0 && <tr><td>Overtime ({r.otHrs}h)</td><td className="n">{money(r.ot)}</td></tr>
                      }
                      {r.xot > 0 && <tr><td>Extra overtime ({r.xotHrs}h)</td><td className="n">{money(r.xot)}</td></tr>}
                      {r.rd > 0 && <tr><td>Rest day pay</td><td className="n">{money(r.rd)}</td></tr>}
                      {r.ph > 0 && <tr><td>Public holiday pay</td><td className="n">{money(r.ph)}</td></tr>}
                      {(r.alCpf > 0 || r.alNon > 0) && <tr><td>Allowances</td><td className="n">{money(r.alCpf + r.alNon)}</td></tr>}
                      {r.adj !== 0 && <tr><td>{r.adjLbl || "Adjustment"}</td><td className="n">{money(r.adj)}</td></tr>}
                      {r.reimb > 0 && <tr><td>{r.reimbLbl || "Reimbursement"}</td><td className="n">{money(r.reimb)}</td></tr>}
                      {r.bonus > 0 && <tr><td>13th month / bonus</td><td className="n">{money(r.bonus)}</td></tr>}
                      <tr><td className="strong">Gross pay</td><td className="n strong">{money(r.gross)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-3)", marginBottom: 8 }}>Deductions</h3>
                  <table>
                    <tbody>
                      <tr><td>Employee CPF</td><td className="n">{money(r.cpf.ee)}</td></tr>
                      {r.ded > 0 && <tr><td>{r.dedLbl || "Deduction"}</td><td className="n">{money(r.ded)}</td></tr>}
                      {r.cdac > 0 && <tr><td>CDAC / community fund</td><td className="n">{money(r.cdac)}</td></tr>}
                      <tr><td className="strong">Net pay</td><td className="n strong">{money(r.net)}</td></tr>
                    </tbody>
                  </table>
                  <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-3)", margin: "16px 0 8px" }}>Employer contributions (info only)</h3>
                  <table>
                    <tbody>
                      <tr><td>Employer CPF</td><td className="n">{money(r.cpf.er)}</td></tr>
                      <tr><td>SDL</td><td className="n">{money(r.sdl)}</td></tr>
                      {r.levy > 0 && <tr><td>Foreign worker levy</td><td className="n">{money(r.levy)}</td></tr>}
                      <tr><td className="strong">Total cost to company</td><td className="n strong">{money(r.cost)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              {r.mc + r.pl + r.ul > 0 && (
                <div className="hint" style={{ marginTop: 14 }}>MC taken: {r.mc}d · Paid leave: {r.pl}d · Unpaid leave: {r.ul}d</div>
              )}
              {r.note && <div className="hint" style={{ marginTop: 6 }}>Note: {r.note}</div>}
            </div>
          </div>
        ))
      )}
    </AppShell>
  );
}
