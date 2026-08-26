import AppShell from "@/components/AppShell";
import EmployeePicker from "@/components/EmployeePicker";
import LeaveCalendar from "@/components/LeaveCalendar";
import { getActiveCompany } from "@/lib/activeCompany";
import { getEmployees, getLeaveDaysForEmployeeMonth, getLeaveUsageForYear } from "@/lib/payrollService";
import { weeksOfMonth, n2 } from "@/lib/payroll";
import { deriveWeekLeaveTotals, sumLeaveTotals } from "@/lib/leave";
import { allowedEmployeeIds } from "@/lib/access";
import { saveLeaveAction } from "./actions";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** MC / leave only — the same calendar as the Attendance screen, without
 *  the hours, overtime or allowances. For a colleague who should only ever
 *  record who was out and when. */
export default async function LeavePage({ searchParams }: { searchParams: Promise<{ ym?: string; emp?: string }> }) {
  const sp = await searchParams;
  const ym = sp.ym || thisMonth();
  const company = await getActiveCompany();

  if (!company) {
    return (
      <AppShell active="/leave">
        <div className="note warn">No company has been set up yet. Ask your administrator to add one in Settings.</div>
      </AppShell>
    );
  }

  const [employeesAll, allowed] = await Promise.all([getEmployees(company.id, { activeOnly: true }), allowedEmployeeIds()]);
  const employees = (allowed ? employeesAll.filter((e) => allowed.has(e.id)) : employeesAll).sort((a, b) => a.name.localeCompare(b.name));

  if (!employees.length) {
    return (
      <AppShell active="/leave">
        <div className="page-head">
          <div>
            <div className="eyebrow">{company.name}</div>
            <h1>MC &amp; leave</h1>
          </div>
        </div>
        <div className="card">
          <div className="empty">{allowed ? "No employees have been assigned to your login yet — ask your administrator." : "No active employees yet."}</div>
        </div>
      </AppShell>
    );
  }

  const selected = employees.find((e) => e.id === sp.emp) ?? employees[0];
  const year = Number(ym.split("-")[0]);

  const [leaveEntries, yearUsage] = await Promise.all([
    getLeaveDaysForEmployeeMonth(selected.id, ym),
    getLeaveUsageForYear(company.id, year),
  ]);

  const weeks = weeksOfMonth(ym);
  const derived = deriveWeekLeaveTotals(ym, leaveEntries, selected.pattern);
  const monthTotals = sumLeaveTotals(derived);
  const usedThisYear = yearUsage.get(selected.id) ?? { mc: 0, pl: 0, ul: 0 };

  return (
    <AppShell active="/leave">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>MC &amp; leave</h1>
          <div className="sub">Pick a person and mark the days they were out. This never touches overtime, allowances or pay rates.</div>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card">
          <div className="bd">
            <div className="flex items-end gap-4 flex-wrap">
              <EmployeePicker employees={employees} selectedId={selected.id} basePath="/leave" ym={ym} />
              <form method="get" className="flex items-end gap-2">
                <input type="hidden" name="emp" value={selected.id} />
                <label className="f" style={{ maxWidth: 170 }}>
                  <span>Month</span>
                  <input className="inp" type="month" name="ym" defaultValue={ym} />
                </label>
                <button className="btn sm" type="submit" style={{ marginBottom: 1 }}>Go</button>
              </form>
            </div>
          </div>
        </div>

        <form action={saveLeaveAction} className="stack-lg">
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="employeeId" value={selected.id} />
          <input type="hidden" name="ym" value={ym} />

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
            <div className="bd stack">
              <div className="note info">
                MC and paid leave don&apos;t change anyone&apos;s pay — they&apos;re recorded for the record. Unpaid leave automatically reduces that week&apos;s pay.
              </div>
              <LeaveCalendar ym={ym} pattern={selected.pattern} initial={leaveEntries} />
            </div>
          </div>

          <div className="card">
            <div className="hd"><h2>Week by week</h2></div>
            <div className="bd">
              <div className="tw">
                <table>
                  <thead>
                    <tr><th>Week</th><th className="n">MC</th><th className="n">Leave</th><th className="n">Unpaid</th></tr>
                  </thead>
                  <tbody>
                    {weeks.map((w, i) => (
                      <tr key={w.i}>
                        <td>
                          <div className="strong">{w.label}</div>
                          <div className="hint">{w.range}</div>
                        </td>
                        <td className="n">{n2(derived[i].mc)}</td>
                        <td className="n">{n2(derived[i].pl)}</td>
                        <td className="n">{n2(derived[i].ul)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <button className="btn pri" type="submit">Save {selected.name} — {ym}</button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
