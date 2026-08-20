import AppShell from "@/components/AppShell";
import Link from "next/link";
import { getActiveCompany } from "@/lib/activeCompany";
import { getEmployees, getLeaveUsageForYear } from "@/lib/payrollService";
import { createEmployeeAction } from "@/app/actions/employees";
import { money } from "@/lib/payroll";

export default async function EmployeesPage() {
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/employees">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  const year = new Date().getFullYear();
  const [employees, usage] = await Promise.all([getEmployees(company.id), getLeaveUsageForYear(company.id, year)]);
  employees.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));

  return (
    <AppShell active="/admin/employees">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 26 }}>Employees</h1>
        <span className="hint">{company.name} — {employees.length} on file</span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <details>
          <summary style={{ cursor: "pointer", padding: "14px 16px", fontWeight: 600, fontSize: 14 }}>+ Add an employee</summary>
          <div className="bd" style={{ borderTop: "1px solid var(--line)" }}>
            <form action={createEmployeeAction}>
              <input type="hidden" name="companyId" value={company.id} />
              <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <label className="f"><span>Name</span><input className="inp" name="name" required /></label>
                <label className="f"><span>Employee no.</span><input className="inp" name="empNo" /></label>
                <label className="f"><span>Date of birth</span><input className="inp" type="date" name="dob" /></label>
                <label className="f"><span>Residency</span>
                  <select className="inp" name="res" defaultValue="FW">
                    <option value="SC">Citizen / PR (full CPF)</option>
                    <option value="FW">Foreign worker (no CPF)</option>
                    <option value="PR">PR (graduated CPF)</option>
                  </select>
                </label>
                <label className="f"><span>PR start date (if PR)</span><input className="inp" type="date" name="prDate" /></label>
                <label className="f"><span>Monthly salary ($)</span><input className="inp num" type="number" step="0.01" name="salary" required /></label>
                <label className="f"><span>Work pattern (days/wk)</span>
                  <select className="inp" name="pattern" defaultValue="5">
                    <option value="5">5-day week</option>
                    <option value="5.5">5.5-day week</option>
                    <option value="6">6-day week</option>
                  </select>
                </label>
                <label className="f"><span>OT multiplier override</span><input className="inp num" type="number" step="0.1" name="otMult" placeholder="company default" /></label>
                <label className="f"><span>Email</span><input className="inp" type="email" name="email" /></label>
                <label className="f"><span>Bank name</span><input className="inp" name="bankName" /></label>
                <label className="f"><span>Bank code</span><input className="inp" name="bankCode" /></label>
                <label className="f"><span>Branch code</span><input className="inp" name="branchCode" /></label>
                <label className="f"><span>Account no.</span><input className="inp" name="acct" /></label>
                <label className="f"><span>Annual leave entitlement (days/yr)</span><input className="inp num" type="number" step="0.5" name="alEntitlement" defaultValue={14} /></label>
                <label className="f"><span>MC entitlement (days/yr)</span><input className="inp num" type="number" step="0.5" name="mcEntitlement" defaultValue={14} /></label>
              </div>
              <div className="flex items-center gap-4" style={{ marginTop: 6, marginBottom: 14 }}>
                <label className="chk"><input type="checkbox" name="otElig" defaultChecked /> Eligible for overtime</label>
                <label className="chk"><input type="checkbox" name="cdacOn" /> Deduct CDAC / community fund</label>
              </div>
              <label className="f" style={{ maxWidth: 220 }}><span>CDAC amount ($/mth)</span><input className="inp num" type="number" step="0.01" name="cdacAmt" placeholder="0" /></label>
              <button className="btn pri" type="submit" style={{ marginTop: 8 }}>Add employee</button>
            </form>
          </div>
        </details>
      </div>

      <div className="card">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Residency</th>
                <th className="n">Salary</th>
                <th className="n">MC used / entitled ({year})</th>
                <th className="n">Leave used / entitled ({year})</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const u = usage.get(e.id) ?? { mc: 0, pl: 0, ul: 0 };
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="strong">{e.name}</div>
                      <div className="hint">{e.empNo}</div>
                    </td>
                    <td>{e.res}</td>
                    <td className="n">{money(e.salary)}</td>
                    <td className="n">{u.mc} / {e.mcEntitlement}</td>
                    <td className="n">{u.pl} / {e.alEntitlement}</td>
                    <td><span className={`pill ${e.active ? "green" : "gray"}`}>{e.active ? "Active" : "Inactive"}</span></td>
                    <td><Link href={`/admin/employees/${e.id}`} className="btn sm">Edit</Link></td>
                  </tr>
                );
              })}
              {!employees.length && (
                <tr><td colSpan={7} className="hint" style={{ padding: 20, textAlign: "center" }}>No employees yet — add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
