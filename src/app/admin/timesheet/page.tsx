import AppShell from "@/components/AppShell";
import { getActiveCompany } from "@/lib/activeCompany";
import { getEmployees, getAllowances, getEmployeeAllowanceLinks, getWeekTimesheetsForCompanyMonth, getMonthlyItemsForCompanyMonth, toCompanyConfig } from "@/lib/payrollService";
import { calcWeek, weeksOfMonth, EMPTY_WEEK, n2 } from "@/lib/payroll";
import { saveTimesheetWeekAction, saveMonthlyItemsAction } from "@/app/actions/timesheet";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminTimesheetPage({ searchParams }: { searchParams: Promise<{ ym?: string; w?: string }> }) {
  const sp = await searchParams;
  const ym = sp.ym || thisMonth();
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/timesheet">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  const weeks = weeksOfMonth(ym);
  const weekIndex = sp.w !== undefined ? Number(sp.w) : weeks[0]?.i ?? 0;
  const wk = weeks.find((w) => w.i === weekIndex) ?? weeks[0];
  const companyConfig = toCompanyConfig(company);

  const [employees, allowances, weeksByEmp, itemsByEmp] = await Promise.all([
    getEmployees(company.id, { activeOnly: true }),
    getAllowances(company.id),
    getWeekTimesheetsForCompanyMonth(company.id, ym),
    getMonthlyItemsForCompanyMonth(company.id, ym),
  ]);
  employees.sort((a, b) => a.name.localeCompare(b.name));
  const linksByEmp = await getEmployeeAllowanceLinks(employees.map((e) => e.id));
  const allowanceIds = allowances.map((a) => a.id);

  const rows = employees.map((e) => {
    const weekTs = (weeksByEmp.get(e.id) ?? weeks.map((w) => EMPTY_WEEK(w.i)))[weekIndex] ?? EMPTY_WEEK(weekIndex);
    const empAllowances = linksByEmp.get(e.id) ?? [];
    const calc = calcWeek(
      companyConfig,
      { id: e.id, name: e.name, dob: e.dob, res: e.res, prDate: e.prDate, salary: e.salary, pattern: e.pattern, otElig: e.otElig, otMult: e.otMult, cdacOn: e.cdacOn, cdacAmt: e.cdacAmt ?? 0, levyAmt: 0 },
      ym,
      wk,
      weekTs,
      allowances,
      empAllowances
    );
    return { emp: e, ts: weekTs, calc, empAllowances };
  });

  return (
    <AppShell active="/admin/timesheet">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Timesheet</h1>
          <div className="sub">Every field, week by week. Staff can only edit MC/leave from their own screen.</div>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card">
          <div className="bd">
            <form method="get" className="flex items-end gap-4 flex-wrap">
              <label className="f" style={{ maxWidth: 170 }}><span>Month</span><input className="inp" type="month" name="ym" defaultValue={ym} /></label>
              <div>
                <div className="hint" style={{ marginBottom: 6 }}>Week</div>
                <div className="weekrow" role="group" aria-label="Week">
                  {weeks.map((w) => (
                    <a key={w.i} href={`/admin/timesheet?ym=${ym}&w=${w.i}`} className={w.i === weekIndex ? "on" : ""} title={w.range}>{w.label}</a>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>

        {!rows.length ? (
          <div className="card"><div className="empty">No active employees yet.</div></div>
        ) : (
          <form action={saveTimesheetWeekAction} className="stack">
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="ym" value={ym} />
            <input type="hidden" name="weekIndex" value={weekIndex} />
            <input type="hidden" name="employeeIds" value={rows.map((r) => r.emp.id).join(",")} />
            <input type="hidden" name="allowanceIds" value={allowanceIds.join(",")} />

            <div className="stack">
              {rows.map(({ emp, ts, calc, empAllowances }) => {
                const linkedAllowances = allowances.filter((a) => empAllowances.some((l) => l.allowanceId === a.id));
                return (
                  <div key={emp.id} className="card">
                    <div className="hd">
                      <h2 style={{ fontSize: 14 }}>{emp.name}</h2>
                      <span className="hint">{n2(calc.days)} / {n2(calc.stdWeek)} days this week{calc.leaveOver ? " · leave exceeds week" : ""}</span>
                    </div>
                    <div className="bd">
                      <div className="fields tight">
                        <label className="f"><span>Days override</span><input className="inp num" type="number" step="0.5" name={`days_${emp.id}`} defaultValue={ts.days ?? ""} placeholder="auto" /></label>
                        <label className="f"><span>OT hrs</span><input className="inp num" type="number" step="0.5" min="0" name={`ot_${emp.id}`} defaultValue={ts.ot || ""} /></label>
                        <label className="f"><span>Extra OT hrs</span><input className="inp num" type="number" step="0.5" min="0" name={`xot_${emp.id}`} defaultValue={ts.xot || ""} /></label>
                        <label className="f"><span>Rest day (1×)</span><input className="inp num" type="number" step="0.5" min="0" name={`rdS_${emp.id}`} defaultValue={ts.rdS || ""} /></label>
                        <label className="f"><span>Rest day (2×)</span><input className="inp num" type="number" step="0.5" min="0" name={`rdF_${emp.id}`} defaultValue={ts.rdF || ""} /></label>
                        <label className="f"><span>Public holiday</span><input className="inp num" type="number" step="0.5" min="0" name={`ph_${emp.id}`} defaultValue={ts.ph || ""} /></label>
                        <label className="f"><span>MC (paid)</span><input className="inp num" type="number" step="0.5" min="0" name={`mc_${emp.id}`} defaultValue={ts.mc || ""} /></label>
                        <label className="f"><span>Leave (paid)</span><input className="inp num" type="number" step="0.5" min="0" name={`pl_${emp.id}`} defaultValue={ts.pl || ""} /></label>
                        <label className="f"><span>Unpaid leave</span><input className="inp num" type="number" step="0.5" min="0" name={`ul_${emp.id}`} defaultValue={ts.ul || ""} /></label>
                        {linkedAllowances.map((a) => (
                          <label className="f" key={a.id}><span>{a.name}</span><input className="inp num" type="number" step="0.5" min="0" name={`qty_${emp.id}_${a.id}`} defaultValue={ts.allowanceQty[a.id] || ""} /></label>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <button className="btn pri" type="submit">Save {wk.label}</button>
            </div>
          </form>
        )}

        {rows.length > 0 && (
          <div className="card">
            <div className="hd">
              <h2>Monthly items — {ym}</h2>
              <span className="hint">Bonus, one-off adjustments, reimbursements and deductions — apply once for the whole month, not per week.</span>
            </div>
            <div className="bd">
              <form action={saveMonthlyItemsAction} className="stack">
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="ym" value={ym} />
                <input type="hidden" name="employeeIds" value={rows.map((r) => r.emp.id).join(",")} />
                <div className="tw">
                  <table>
                    <thead>
                      <tr><th>Employee</th><th className="n">13th month / bonus</th><th className="n">Adjustment</th><th>Label</th><th className="n">Reimbursement</th><th>Label</th><th className="n">Deduction</th><th>Label</th><th>Note</th><th>Paid</th></tr>
                    </thead>
                    <tbody>
                      {rows.map(({ emp }) => {
                        const item = itemsByEmp.get(emp.id) ?? { bonus: 0, adj: 0, adjLbl: "", reimb: 0, reimbLbl: "", ded: 0, dedLbl: "", note: "", paid: false };
                        return (
                          <tr key={emp.id}>
                            <td className="strong">{emp.name}</td>
                            <td className="n"><input className="inp num" type="number" step="0.01" name={`bonus_${emp.id}`} defaultValue={item.bonus || ""} style={{ width: 100 }} /></td>
                            <td className="n"><input className="inp num" type="number" step="0.01" name={`adj_${emp.id}`} defaultValue={item.adj || ""} style={{ width: 90 }} /></td>
                            <td><input className="inp" name={`adjLbl_${emp.id}`} defaultValue={item.adjLbl} style={{ width: 110 }} /></td>
                            <td className="n"><input className="inp num" type="number" step="0.01" name={`reimb_${emp.id}`} defaultValue={item.reimb || ""} style={{ width: 90 }} /></td>
                            <td><input className="inp" name={`reimbLbl_${emp.id}`} defaultValue={item.reimbLbl} style={{ width: 110 }} /></td>
                            <td className="n"><input className="inp num" type="number" step="0.01" name={`ded_${emp.id}`} defaultValue={item.ded || ""} style={{ width: 90 }} /></td>
                            <td><input className="inp" name={`dedLbl_${emp.id}`} defaultValue={item.dedLbl} style={{ width: 110 }} /></td>
                            <td><input className="inp" name={`note_${emp.id}`} defaultValue={item.note} style={{ width: 130 }} /></td>
                            <td><input type="checkbox" name={`paid_${emp.id}`} defaultChecked={item.paid} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div>
                  <button className="btn pri" type="submit">Save monthly items</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
