import AppShell from "@/components/AppShell";
import { getActiveCompany } from "@/lib/activeCompany";
import { getMonthPayroll } from "@/lib/payrollService";
import { money } from "@/lib/payroll";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function BankPage({ searchParams }: { searchParams: Promise<{ ym?: string }> }) {
  const sp = await searchParams;
  const ym = sp.ym || thisMonth();
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/bank">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  const rows = await getMonthPayroll(company.id, ym);
  const missing = rows.filter((r) => !r.empRow.acct);
  const payable = rows.filter((r) => r.empRow.acct);
  const total = payable.reduce((s, r) => s + r.net, 0);

  return (
    <AppShell active="/admin/bank">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Bank file</h1>
          <div className="sub">A bulk-payment CSV your bank&apos;s portal can import.</div>
        </div>
        <form method="get" className="actions">
          <input className="inp" type="month" name="ym" defaultValue={ym} style={{ width: 160 }} />
          <button className="btn sm" type="submit">Go</button>
        </form>
      </div>

      <div className="stack-lg">
        {missing.length > 0 && (
          <div className="note warn">
            {missing.length} employee{missing.length > 1 ? "s" : ""} have no bank account on file and will be skipped: {missing.map((r) => r.emp.name).join(", ")}.
          </div>
        )}

        <div className="card">
          <div className="bd flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="strong">{payable.length} payment{payable.length === 1 ? "" : "s"}</div>
              <span className="hint">Total: {money(total)}</span>
            </div>
            <a className="btn pri" href={`/admin/bank/export?ym=${ym}&companyId=${company.id}`}>Download CSV</a>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Employee</th><th>Bank</th><th>Account</th><th className="n">Net pay</th></tr></thead>
              <tbody>
                {payable.length ? payable.map((r) => (
                  <tr key={r.emp.id}>
                    <td>{r.emp.name}</td>
                    <td>{r.empRow.bankName} {r.empRow.bankCode}</td>
                    <td>{r.empRow.acct}</td>
                    <td className="n">{money(r.net)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="empty">No payments to make for {ym}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
