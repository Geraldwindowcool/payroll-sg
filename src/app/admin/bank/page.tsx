import AppShell from "@/components/AppShell";
import SubmitButton from "@/components/SubmitButton";
import RowSaveButton from "@/components/RowSaveButton";
import { getActiveCompany } from "@/lib/activeCompany";
import { getMonthPayroll } from "@/lib/payrollService";
import { money } from "@/lib/payroll";
import { updateEmployeeBankDetailsAction } from "@/app/actions/employees";

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
  const payable = rows.filter((r) => r.empRow.acct);
  const missingCount = rows.length - payable.length;
  const total = payable.reduce((s, r) => s + r.net, 0);

  return (
    <AppShell active="/admin/bank">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Bank file</h1>
          <div className="sub">A bulk-payment CSV your bank&apos;s portal can import. Fix a wrong or missing bank detail directly below.</div>
        </div>
        <form method="get" className="actions">
          <input className="inp" type="month" name="ym" defaultValue={ym} style={{ width: 160 }} />
          <button className="btn sm" type="submit">Go</button>
        </form>
      </div>

      <div className="stack-lg">
        {missingCount > 0 && (
          <div className="note warn">
            {missingCount} employee{missingCount > 1 ? "s" : ""} have no bank account on file and will be skipped from the download — fill theirs in below.
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

          {/* One hidden form per employee, referenced by id from the row's
              inputs below via the form="..." attribute — forms can't
              legally nest inside <tr>/<tbody>. */}
          {rows.map((r) => (
            <form key={r.emp.id} action={updateEmployeeBankDetailsAction} id={`bank-${r.emp.id}`}>
              <input type="hidden" name="id" value={r.emp.id} />
            </form>
          ))}

          <div className="tw">
            <table>
              <thead>
                <tr><th>Employee</th><th>Bank name</th><th>Bank code</th><th>Branch code</th><th>Account number</th><th className="n">Net pay</th><th /></tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((r) => (
                  <tr key={r.emp.id}>
                    <td>
                      {r.emp.name}
                      {!r.empRow.acct && <span className="pill red" style={{ marginLeft: 8 }}>Missing</span>}
                    </td>
                    <td><input className="inp" form={`bank-${r.emp.id}`} name="bankName" defaultValue={r.empRow.bankName} style={{ minWidth: 110 }} /></td>
                    <td><input className="inp" form={`bank-${r.emp.id}`} name="bankCode" defaultValue={r.empRow.bankCode} style={{ minWidth: 90 }} /></td>
                    <td><input className="inp" form={`bank-${r.emp.id}`} name="branchCode" defaultValue={r.empRow.branchCode} style={{ minWidth: 90 }} /></td>
                    <td><input className="inp" form={`bank-${r.emp.id}`} name="acct" defaultValue={r.empRow.acct} style={{ minWidth: 140 }} /></td>
                    <td className="n">{money(r.net)}</td>
                    <td><RowSaveButton formId={`bank-${r.emp.id}`} action={updateEmployeeBankDetailsAction} className="btn sm">Save</RowSaveButton></td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="empty">No employees for {ym}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
