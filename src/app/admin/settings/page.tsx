import { Fragment } from "react";
import AppShell from "@/components/AppShell";
import { getActiveCompany } from "@/lib/activeCompany";
import { getCompanies, getLevies, getEmployees } from "@/lib/payrollService";
import { getUsers, getEmployeeAccessByUser } from "@/lib/usersService";
import { auth } from "@/lib/auth";
import { updateCompanyAction, updateCpfAction } from "@/app/actions/settings";
import { createLevyAction, updateLevyAction, deleteLevyAction } from "@/app/actions/levies";
import { addCompanyAction, deleteCompanyAction } from "@/app/actions/company";
import { createUserAction, updateUserAction, setUserEmployeeAccessAction } from "@/app/actions/users";
import type { CpfConfig } from "@/lib/payroll";
import CreateUserForm from "./CreateUserForm";

export default async function SettingsPage() {
  const company = await getActiveCompany();
  const [companies, session] = await Promise.all([getCompanies(), auth()]);
  const me = session?.user;

  if (!company) {
    return (
      <AppShell active="/admin/settings">
        <div className="card">
          <div className="hd"><h2 style={{ fontSize: 16 }}>Add your first company</h2></div>
          <div className="bd">
            <form action={addCompanyAction} className="flex items-center gap-2">
              <input className="inp" name="name" placeholder="Company name" required style={{ maxWidth: 300 }} />
              <button className="btn pri" type="submit">Add</button>
            </form>
          </div>
        </div>
      </AppShell>
    );
  }

  const [levies, users, companyEmployees, accessByUser] = await Promise.all([
    getLevies(company.id),
    getUsers(),
    getEmployees(company.id, { activeOnly: true }),
    getEmployeeAccessByUser(company.id),
  ]);
  const sortedCompanyEmployees = [...companyEmployees].sort((a, b) => a.name.localeCompare(b.name));
  const cpf = company.cpf as unknown as CpfConfig;

  return (
    <AppShell active="/admin/settings">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card">
          <div className="hd"><h2>Company — {company.name}</h2></div>
          <div className="bd">
            <form action={updateCompanyAction} className="stack">
              <input type="hidden" name="id" value={company.id} />
              <div className="fields">
                <label className="f"><span>Company name</span><input className="inp" name="name" defaultValue={company.name} required /></label>
                <label className="f"><span>UEN</span><input className="inp" name="uen" defaultValue={company.uen} /></label>
                <label className="f"><span>Paying bank</span><input className="inp" name="bank" defaultValue={company.bank} /></label>
                <label className="f"><span>Paying account no.</span><input className="inp" name="acct" defaultValue={company.acct} /></label>
                <label className="f"><span>Payment reference</span><input className="inp" name="ref" defaultValue={company.ref} /></label>
                <label className="f"><span>Standard hours / week</span><input className="inp num" type="number" step="0.5" name="hoursPerWeek" defaultValue={company.hoursPerWeek} /></label>
                <label className="f"><span>Default OT multiplier</span><input className="inp num" type="number" step="0.1" name="otMult" defaultValue={company.otMult} /></label>
              </div>
              <div className="toggles">
                <label className="chk"><input type="checkbox" name="sdlEnabled" defaultChecked={company.sdlEnabled} /> SDL enabled</label>
                <label className="chk"><input type="checkbox" name="roundNet" defaultChecked={company.roundNet} /> Round net pay down to nearest 5 cents</label>
              </div>
              <div><button className="btn pri" type="submit">Save company details</button></div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>CPF rates</h2><span className="hint">Editable in case MOM/CPF Board rates change — defaults are the January 2026 table.</span></div>
          <div className="bd">
            <form action={updateCpfAction} className="stack">
              <input type="hidden" name="id" value={company.id} />
              <div className="fields tight">
                <label className="f"><span>OW ceiling ($/mth)</span><input className="inp num" type="number" name="owCeiling" defaultValue={cpf.owCeiling} /></label>
                <label className="f"><span>Annual (OW+AW) ceiling ($)</span><input className="inp num" type="number" name="annualCeiling" defaultValue={cpf.annualCeiling} /></label>
                <label className="f"><span>Min wage for CPF ($)</span><input className="inp num" type="number" name="minWage" defaultValue={cpf.minWage} /></label>
                <label className="f"><span>Low-wage band ($)</span><input className="inp num" type="number" name="lowBand" defaultValue={cpf.lowBand} /></label>
                <label className="f"><span>Full-wage band ($)</span><input className="inp num" type="number" name="fullBand" defaultValue={cpf.fullBand} /></label>
              </div>
              <div className="tw">
                <table>
                  <thead><tr><th>Age band</th><th className="n" colSpan={2}>SC / PR (3rd yr+)</th><th className="n" colSpan={2}>PR 1st year</th><th className="n" colSpan={2}>PR 2nd year</th></tr></thead>
                  <tbody>
                    {cpf.bands.map((b) => (
                      <tr key={b.id}>
                        <td>{b.label}</td>
                        {(["full", "pr1", "pr2"] as const).map((scheme) => {
                          const r = cpf.rates[scheme]?.[b.id] ?? [0, 0];
                          return (
                            <Fragment key={scheme}>
                              <td className="n"><input className="inp num" type="number" step="0.1" name={`cpf_${scheme}_${b.id}_total`} defaultValue={r[0]} style={{ width: 70 }} /></td>
                              <td className="n"><input className="inp num" type="number" step="0.1" name={`cpf_${scheme}_${b.id}_ee`} defaultValue={r[1]} style={{ width: 70 }} /></td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="hint">Each pair is Total % / Employee %.</div>
              <div><button className="btn pri" type="submit">Save CPF rates</button></div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>Foreign worker levy tiers</h2></div>
          <div className="bd">
            {levies.map((l) => (
              <form key={l.id} action={updateLevyAction} className="flex items-center gap-2" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <input type="hidden" name="id" value={l.id} />
                <input className="inp" name="label" defaultValue={l.label} style={{ maxWidth: 220 }} />
                <input className="inp num" type="number" step="0.01" name="amt" defaultValue={l.amt} style={{ maxWidth: 120 }} />
                <button className="btn sm" type="submit">Save</button>
                <button className="btn sm danger" type="submit" formAction={deleteLevyAction}>Delete</button>
              </form>
            ))}
            {!levies.length && <div className="empty">No levy tiers yet — add one below.</div>}
            <form action={createLevyAction} className="flex items-center gap-2" style={{ marginTop: 12 }}>
              <input type="hidden" name="companyId" value={company.id} />
              <input className="inp" name="label" placeholder="e.g. R1 tier" required style={{ maxWidth: 220 }} />
              <input className="inp num" type="number" step="0.01" name="amt" placeholder="Amount" required style={{ maxWidth: 120 }} />
              <button className="btn pri" type="submit">Add tier</button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>Companies</h2></div>
          <div className="bd">
            <table>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}{c.id === company.id ? <span className="pill blue" style={{ marginLeft: 8 }}>Active</span> : null}</td>
                    <td style={{ textAlign: "right" }}>
                      {companies.length > 1 && (
                        <form action={deleteCompanyAction} style={{ display: "inline" }}>
                          <input type="hidden" name="companyId" value={c.id} />
                          <button className="btn sm danger" type="submit">Remove</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form action={addCompanyAction} className="flex items-center gap-2" style={{ marginTop: 14 }}>
              <input className="inp" name="name" placeholder="New company name" required style={{ maxWidth: 260 }} />
              <button className="btn" type="submit">Add company</button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>Users &amp; logins</h2><span className="hint">Create a login for your colleague so they can key in MC/leave. Give them the Staff role — only Administrators can see payroll.</span></div>
          <div className="bd stack">
            {/* One hidden form per user, referenced by id from the table cells below via the
                form="..." attribute — forms can't legally nest inside <tr>/<tbody>. */}
            {users.map((u) => (
              <form key={u.id} action={updateUserAction} id={`user-${u.id}`}>
                <input type="hidden" name="id" value={u.id} />
              </form>
            ))}
            <div className="tw">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Reset password</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><input className="inp" name="name" form={`user-${u.id}`} defaultValue={u.name} style={{ maxWidth: 160 }} /></td>
                      <td className="hint">{u.email}{u.id === me?.id ? " (you)" : ""}</td>
                      <td>
                        <select className="inp" name="role" form={`user-${u.id}`} defaultValue={u.role} style={{ maxWidth: 130 }}>
                          <option value="STAFF">Staff (MC/leave only)</option>
                          <option value="ADMIN">Administrator</option>
                        </select>
                      </td>
                      <td><label className="chk"><input type="checkbox" name="active" form={`user-${u.id}`} defaultChecked={u.active} /> Active</label></td>
                      <td className="flex items-center gap-2">
                        <input className="inp" type="password" name="password" form={`user-${u.id}`} placeholder="new password" style={{ maxWidth: 130 }} />
                        <button className="btn sm" type="submit" form={`user-${u.id}`}>Save</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.filter((u) => u.role === "STAFF").length > 0 && (
              <div className="stack" style={{ paddingTop: "var(--sp-4)", borderTop: "1px solid var(--line)" }}>
                <div>
                  <div className="cap" style={{ fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-3)" }}>Employee access — {company.name}</div>
                  <p className="hint" style={{ marginTop: 4 }}>
                    By default a Staff login sees every employee. Tick specific people below to restrict a login to only them — e.g. a colleague who should only fill in attendance/MC for a few staff, not everyone.
                  </p>
                </div>
                {!sortedCompanyEmployees.length ? (
                  <div className="hint">No employees on file for this company yet.</div>
                ) : (
                  users
                    .filter((u) => u.role === "STAFF")
                    .map((u) => {
                      const assigned = accessByUser.get(u.id);
                      return (
                        <details key={u.id} className="card disclosure">
                          <summary>
                            {u.name} — {assigned?.size ? `restricted to ${assigned.size} of ${sortedCompanyEmployees.length}` : "sees everyone (unrestricted)"}
                          </summary>
                          <div className="bd">
                            <form action={setUserEmployeeAccessAction} className="stack">
                              <input type="hidden" name="userId" value={u.id} />
                              <input type="hidden" name="companyId" value={company.id} />
                              <div className="flex items-center gap-4 flex-wrap">
                                {sortedCompanyEmployees.map((e) => (
                                  <label key={e.id} className="chk">
                                    <input type="checkbox" name="employeeIds" value={e.id} defaultChecked={assigned?.has(e.id) ?? false} /> {e.name}
                                  </label>
                                ))}
                              </div>
                              <div>
                                <button className="btn sm pri" type="submit">Save access for {u.name}</button>
                              </div>
                            </form>
                          </div>
                        </details>
                      );
                    })
                )}
              </div>
            )}

            <CreateUserForm action={createUserAction} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
