import AppShell from "@/components/AppShell";
import EmployeePicker from "@/components/EmployeePicker";
import MonthPicker from "@/components/MonthPicker";
import SubmitButton from "@/components/SubmitButton";
import LeaveCalendar from "@/components/LeaveCalendar";
import { getActiveCompany } from "@/lib/activeCompany";
import {
  getEmployees,
  getAllowances,
  getEmployeeAllowanceLinks,
  getWeekTimesheets,
  getMonthlyItem,
  getLeaveDaysForEmployeeMonth,
  getLeaveUsageForYear,
  toCompanyConfig,
} from "@/lib/payrollService";
import { calcWeek, weeksOfMonth, n2 } from "@/lib/payroll";
import { deriveWeekLeaveTotals, sumLeaveTotals } from "@/lib/leave";
import { saveTimesheetMonthAction } from "@/app/actions/timesheet";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Full timesheet for ONE employee's month — MC/leave marked on a calendar,
 *  hours entered week by week, and the month's bonus/adjustment/deduction
 *  items underneath. Same layout as the staff Attendance screen, plus the
 *  monthly items that stay admin-only. */
export default async function AdminTimesheetPage({ searchParams }: { searchParams: Promise<{ ym?: string; emp?: string }> }) {
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

  const [employeesAll, allowances] = await Promise.all([getEmployees(company.id, { activeOnly: true }), getAllowances(company.id)]);
  const employees = [...employeesAll].sort((a, b) => a.name.localeCompare(b.name));

  if (!employees.length) {
    return (
      <AppShell active="/admin/timesheet">
        <div className="page-head">
          <div>
            <div className="eyebrow">{company.name}</div>
            <h1>Timesheet</h1>
          </div>
        </div>
        <div className="card"><div className="empty">No active employees yet.</div></div>
      </AppShell>
    );
  }

  const selected = employees.find((e) => e.id === sp.emp) ?? employees[0];
  const year = Number(ym.split("-")[0]);

  const [weekTs, leaveEntries, linksByEmp, monthlyItem, yearUsage] = await Promise.all([
    getWeekTimesheets(selected.id, ym),
    getLeaveDaysForEmployeeMonth(selected.id, ym),
    getEmployeeAllowanceLinks([selected.id]),
    getMonthlyItem(selected.id, ym),
    getLeaveUsageForYear(company.id, year),
  ]);

  const companyConfig = toCompanyConfig(company);
  const empAllowances = linksByEmp.get(selected.id) ?? [];
  const linkedAllowances = allowances.filter((a) => empAllowances.some((l) => l.allowanceId === a.id));
  const weeks = weeksOfMonth(ym);
  const derived = deriveWeekLeaveTotals(ym, leaveEntries, selected.pattern);
  const monthTotals = sumLeaveTotals(derived);
  const usedThisYear = yearUsage.get(selected.id) ?? { mc: 0, pl: 0, ul: 0 };

  const empCalc = {
    id: selected.id,
    name: selected.name,
    dob: selected.dob,
    res: selected.res,
    prDate: selected.prDate,
    salary: selected.salary,
    pattern: selected.pattern,
    otElig: selected.otElig,
    otMult: selected.otMult,
    cdacOn: selected.cdacOn,
    cdacAmt: selected.cdacAmt ?? 0,
    levyAmt: 0,
  };

  const weekRows = weeks.map((w, i) => {
    const ts = weekTs[i];
    const calc = calcWeek(companyConfig, empCalc, ym, w, { ...ts, ...derived[i] }, allowances, empAllowances);
    return { w, ts, calc, leave: derived[i] };
  });

  return (
    <AppShell active="/admin/timesheet">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Timesheet</h1>
          <div className="sub">Pick a person, mark their MC/leave days, then fill in hours and monthly items.</div>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card">
          <div className="bd">
            <div className="flex items-end gap-4 flex-wrap">
              <EmployeePicker employees={employees} selectedId={selected.id} basePath="/admin/timesheet" ym={ym} />
              <MonthPicker ym={ym} employeeId={selected.id} basePath="/admin/timesheet" />
            </div>
          </div>
        </div>

        <form action={saveTimesheetMonthAction} className="stack-lg">
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="employeeId" value={selected.id} />
          <input type="hidden" name="ym" value={ym} />
          <input type="hidden" name="allowanceIds" value={allowances.map((a) => a.id).join(",")} />

          <div className="card">
            <div className="hd">
              <h2>{selected.name} — {ym}</h2>
              <div className="mini-stats">
                <span className="mini-stat"><span className="k">Pattern</span><span className="v">{selected.pattern}-day week</span></span>
                <span className="mini-stat"><span className="k">This month</span><span className="v">{n2(monthTotals.mc)} MC · {n2(monthTotals.pl)} leave · {n2(monthTotals.ul)} unpaid</span></span>
                <span className="mini-stat"><span className="k">{year} MC used</span><span className="v">{n2(usedThisYear.mc)} / {selected.mcEntitlement}</span></span>
                <span className="mini-stat"><span className="k">{year} leave used</span><span className="v">{n2(usedThisYear.pl)} / {selected.alEntitlement}</span></span>
              </div>
            </div>
            <div className="bd">
              <LeaveCalendar ym={ym} pattern={selected.pattern} initial={leaveEntries} companyId={company.id} employeeId={selected.id} />
            </div>
          </div>

          <div className="card">
            <div className="hd">
              <h2>Hours &amp; days</h2>
              <span className="hint">MC and leave columns come from the calendar above.</span>
            </div>
            <div className="bd">
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th className="n">Days</th>
                      <th className="n">Days override</th>
                      <th className="n">OT hrs</th>
                      <th className="n">Extra OT</th>
                      <th className="n">Rest day 1×</th>
                      <th className="n">Rest day 2×</th>
                      <th className="n">Public hol.</th>
                      <th className="n">MC</th>
                      <th className="n">Leave</th>
                      <th className="n">Unpaid</th>
                      {linkedAllowances.map((a) => <th key={a.id} className="n">{a.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {weekRows.map(({ w, ts, calc, leave }) => (
                      <tr key={w.i}>
                        <td>
                          <div className="strong">{w.label}</div>
                          <div className="hint">{w.range}</div>
                        </td>
                        <td className="n">{n2(calc.days)} <span className="hint">/ {n2(calc.stdWeek)}</span></td>
                        <td className="n"><input className="inp num" type="number" step="0.5" name={`days_${w.i}`} defaultValue={ts.days ?? ""} placeholder="auto" style={{ width: 80 }} /></td>
                        <td className="n"><input className="inp num" type="number" step="0.5" min="0" name={`ot_${w.i}`} defaultValue={ts.ot || ""} style={{ width: 75 }} /></td>
                        <td className="n"><input className="inp num" type="number" step="0.5" min="0" name={`xot_${w.i}`} defaultValue={ts.xot || ""} style={{ width: 75 }} /></td>
                        <td className="n"><input className="inp num" type="number" step="0.5" min="0" name={`rdS_${w.i}`} defaultValue={ts.rdS || ""} style={{ width: 75 }} /></td>
                        <td className="n"><input className="inp num" type="number" step="0.5" min="0" name={`rdF_${w.i}`} defaultValue={ts.rdF || ""} style={{ width: 75 }} /></td>
                        <td className="n"><input className="inp num" type="number" step="0.5" min="0" name={`ph_${w.i}`} defaultValue={ts.ph || ""} style={{ width: 75 }} /></td>
                        <td className="n hint">{n2(leave.mc)}</td>
                        <td className="n hint">{n2(leave.pl)}</td>
                        <td className="n hint">{n2(leave.ul)}</td>
                        {linkedAllowances.map((a) => (
                          <td key={a.id} className="n">
                            <input className="inp num" type="number" step="0.5" min="0" name={`qty_${w.i}_${a.id}`} defaultValue={ts.allowanceQty[a.id] || ""} style={{ width: 75 }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="hd">
              <h2>Monthly items — {ym}</h2>
              <span className="hint">Bonus, one-off adjustments, reimbursements and deductions — apply once for the whole month, not per week.</span>
            </div>
            <div className="bd">
              <div className="fields">
                <label className="f"><span>13th month / bonus</span><input className="inp num" type="number" step="0.01" name="bonus" defaultValue={monthlyItem.bonus || ""} /></label>
                <label className="f"><span>Adjustment</span><input className="inp num" type="number" step="0.01" name="adj" defaultValue={monthlyItem.adj || ""} /></label>
                <label className="f"><span>Adjustment label</span><input className="inp" name="adjLbl" defaultValue={monthlyItem.adjLbl} /></label>
                <label className="f"><span>Reimbursement</span><input className="inp num" type="number" step="0.01" name="reimb" defaultValue={monthlyItem.reimb || ""} /></label>
                <label className="f"><span>Reimbursement label</span><input className="inp" name="reimbLbl" defaultValue={monthlyItem.reimbLbl} /></label>
                <label className="f"><span>Deduction</span><input className="inp num" type="number" step="0.01" name="ded" defaultValue={monthlyItem.ded || ""} /></label>
                <label className="f"><span>Deduction label</span><input className="inp" name="dedLbl" defaultValue={monthlyItem.dedLbl} /></label>
                <label className="f"><span>Note</span><input className="inp" name="note" defaultValue={monthlyItem.note} /></label>
              </div>
              <div className="toggles">
                <label className="chk"><input type="checkbox" name="paid" defaultChecked={monthlyItem.paid} /> Marked as paid</label>
              </div>
            </div>
          </div>

          <div>
            <SubmitButton>Save {selected.name} — {ym}</SubmitButton>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
