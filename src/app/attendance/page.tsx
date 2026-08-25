import AppShell from "@/components/AppShell";
import Link from "next/link";
import { getActiveCompany } from "@/lib/activeCompany";
import { getEmployees, getAllowances, getEmployeeAllowanceLinks, getWeekTimesheetsForCompanyMonth, toCompanyConfig } from "@/lib/payrollService";
import { calcWeek, weeksOfMonth, EMPTY_WEEK, n2 } from "@/lib/payroll";
import { allowedEmployeeIds } from "@/lib/access";
import { saveAttendanceAction } from "./actions";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Attendance + MC/leave in one screen — days worked, OT, rest day, public
 *  holiday, MC/paid/unpaid leave, and allowance quantities. Deliberately
 *  leaves out bonuses/adjustments/deductions (see /admin/timesheet), which
 *  stay admin-only. Open to Staff logins, narrowed to whichever employees
 *  they've been assigned in Settings — see allowedEmployeeIds(). */
export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ ym?: string; w?: string }> }) {
  const sp = await searchParams;
  const ym = sp.ym || thisMonth();
  const company = await getActiveCompany();

  if (!company) {
    return (
      <AppShell active="/attendance">
        <div className="note warn">No company has been set up yet. Ask your administrator to add one in Settings.</div>
      </AppShell>
    );
  }

  const weeks = weeksOfMonth(ym);
  const weekIndex = sp.w !== undefined ? Number(sp.w) : weeks[0]?.i ?? 0;
  const wk = weeks.find((w) => w.i === weekIndex) ?? weeks[0];
  const companyConfig = toCompanyConfig(company);

  const [employeesAll, allowances, weeksByEmp, allowed] = await Promise.all([
    getEmployees(company.id, { activeOnly: true }),
    getAllowances(company.id),
    getWeekTimesheetsForCompanyMonth(company.id, ym),
    allowedEmployeeIds(),
  ]);
  const employees = (allowed ? employeesAll.filter((e) => allowed.has(e.id)) : employeesAll).sort((a, b) => a.name.localeCompare(b.name));
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
    <AppShell active="/attendance">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Attendance &amp; MC</h1>
          <div className="sub">Days worked, overtime, rest days and leave — week by week.</div>
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
                    <Link key={w.i} href={`/attendance?ym=${ym}&w=${w.i}`} className={w.i === weekIndex ? "on" : ""} title={w.range} prefetch>{w.label}</Link>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>

        {!rows.length ? (
          <div className="card"><div className="empty">{allowed ? "No employees have been assigned to your login yet — ask your administrator." : "No active employees yet."}</div></div>
        ) : (
          <form action={saveAttendanceAction} className="stack">
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
      </div>
    </AppShell>
  );
}
