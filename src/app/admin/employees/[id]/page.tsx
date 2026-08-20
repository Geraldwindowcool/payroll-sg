import AppShell from "@/components/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmployee, getAllowances, getLevies, getEmployeeAllowanceLinks } from "@/lib/payrollService";
import { updateEmployeeAction, deleteEmployeeAction } from "@/app/actions/employees";
import { setEmployeeAllowancesAction } from "@/app/actions/employees";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const emp = await getEmployee(id);
  if (!emp) notFound();

  const [allowances, levies, linksByEmp] = await Promise.all([getAllowances(emp.companyId), getLevies(emp.companyId), getEmployeeAllowanceLinks([id])]);
  const links = linksByEmp.get(id) ?? [];
  const linkedIds = new Set(links.map((l) => l.allowanceId));

  return (
    <AppShell active="/admin/employees">
      <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
        <Link href="/admin/employees" className="hint" style={{ textDecoration: "none" }}>← Employees</Link>
      </div>
      <h1 style={{ fontSize: 26, marginBottom: 16 }}>{emp.name}</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="hd"><h2 style={{ fontSize: 16 }}>Details</h2></div>
        <div className="bd">
          <form action={updateEmployeeAction}>
            <input type="hidden" name="id" value={emp.id} />
            <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="f"><span>Name</span><input className="inp" name="name" defaultValue={emp.name} required /></label>
              <label className="f"><span>Employee no.</span><input className="inp" name="empNo" defaultValue={emp.empNo} /></label>
              <label className="f"><span>Date of birth</span><input className="inp" type="date" name="dob" defaultValue={emp.dob} /></label>
              <label className="f"><span>Residency</span>
                <select className="inp" name="res" defaultValue={emp.res}>
                  <option value="SC">Citizen / PR (full CPF)</option>
                  <option value="FW">Foreign worker (no CPF)</option>
                  <option value="PR">PR (graduated CPF)</option>
                </select>
              </label>
              <label className="f"><span>PR start date (if PR)</span><input className="inp" type="date" name="prDate" defaultValue={emp.prDate} /></label>
              <label className="f"><span>Monthly salary ($)</span><input className="inp num" type="number" step="0.01" name="salary" defaultValue={emp.salary} required /></label>
              <label className="f"><span>Work pattern (days/wk)</span>
                <select className="inp" name="pattern" defaultValue={String(emp.pattern)}>
                  <option value="5">5-day week</option>
                  <option value="5.5">5.5-day week</option>
                  <option value="6">6-day week</option>
                </select>
              </label>
              <label className="f"><span>OT multiplier override</span><input className="inp num" type="number" step="0.1" name="otMult" defaultValue={emp.otMult ?? ""} placeholder="company default" /></label>
              <label className="f"><span>Levy tier (foreign worker)</span>
                <select className="inp" name="levyId" defaultValue={emp.levyId ?? ""}>
                  <option value="">— none —</option>
                  {levies.map((l) => <option key={l.id} value={l.id}>{l.label} (${l.amt})</option>)}
                </select>
              </label>
              <label className="f"><span>Email</span><input className="inp" type="email" name="email" defaultValue={emp.email} /></label>
              <label className="f"><span>Bank name</span><input className="inp" name="bankName" defaultValue={emp.bankName} /></label>
              <label className="f"><span>Bank code</span><input className="inp" name="bankCode" defaultValue={emp.bankCode} /></label>
              <label className="f"><span>Branch code</span><input className="inp" name="branchCode" defaultValue={emp.branchCode} /></label>
              <label className="f"><span>Account no.</span><input className="inp" name="acct" defaultValue={emp.acct} /></label>
              <label className="f"><span>Annual leave entitlement (days/yr)</span><input className="inp num" type="number" step="0.5" name="alEntitlement" defaultValue={emp.alEntitlement} /></label>
              <label className="f"><span>MC entitlement (days/yr)</span><input className="inp num" type="number" step="0.5" name="mcEntitlement" defaultValue={emp.mcEntitlement} /></label>
              <label className="f"><span>CDAC amount ($/mth)</span><input className="inp num" type="number" step="0.01" name="cdacAmt" defaultValue={emp.cdacAmt ?? ""} placeholder="0" /></label>
            </div>
            <div className="flex items-center gap-4" style={{ margin: "6px 0 14px" }}>
              <label className="chk"><input type="checkbox" name="otElig" defaultChecked={emp.otElig} /> Eligible for overtime</label>
              <label className="chk"><input type="checkbox" name="cdacOn" defaultChecked={emp.cdacOn} /> Deduct CDAC / community fund</label>
              <label className="chk"><input type="checkbox" name="active" defaultChecked={emp.active} /> Active</label>
            </div>
            <button className="btn pri" type="submit">Save changes</button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="hd"><h2 style={{ fontSize: 16 }}>Allowances</h2><span className="hint">Tick the allowances this employee is eligible for. Leave the rate blank to use the company default.</span></div>
        <div className="bd">
          {!allowances.length ? (
            <div className="hint">No allowances set up yet — add some in Allowances.</div>
          ) : (
            <form action={setEmployeeAllowancesAction}>
              <input type="hidden" name="employeeId" value={emp.id} />
              <div className="tw">
                <table>
                  <thead><tr><th></th><th>Allowance</th><th>Basis</th><th className="n">Default rate</th><th className="n">Rate override</th></tr></thead>
                  <tbody>
                    {allowances.map((a) => {
                      const link = links.find((l) => l.allowanceId === a.id);
                      return (
                        <tr key={a.id}>
                          <td><input type="checkbox" name="allowanceIds" value={a.id} defaultChecked={linkedIds.has(a.id)} /></td>
                          <td>{a.name}</td>
                          <td>{a.basis}</td>
                          <td className="n">${a.rate}</td>
                          <td className="n"><input className="inp num" type="number" step="0.01" name={`rateOverride_${a.id}`} defaultValue={link?.rateOverride ?? ""} style={{ width: 100 }} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button className="btn pri" type="submit" style={{ marginTop: 12 }}>Save allowances</button>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <div className="hd"><h2 style={{ fontSize: 16, color: "var(--bad)" }}>Danger zone</h2></div>
        <div className="bd">
          <p className="hint" style={{ marginBottom: 10 }}>Deleting permanently erases this employee&apos;s timesheets and pay history. Untick &quot;Active&quot; above instead if you just want to stop paying them.</p>
          <form action={deleteEmployeeAction}>
            <input type="hidden" name="id" value={emp.id} />
            <button className="btn danger" type="submit">Delete employee permanently</button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
