import AppShell from "@/components/AppShell";
import Link from "next/link";
import { getActiveCompany } from "@/lib/activeCompany";
import { getEmployees, getWeekTimesheetsForCompanyMonth, toCompanyConfig } from "@/lib/payrollService";
import { calcWeek, weeksOfMonth, EMPTY_WEEK, n2 } from "@/lib/payroll";
import { saveLeaveAction } from "./actions";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function LeavePage({ searchParams }: { searchParams: Promise<{ ym?: string; w?: string }> }) {
  const sp = await searchParams;
  const ym = sp.ym || thisMonth();
  const company = await getActiveCompany();

  if (!company) {
    return (
      <AppShell>
        <div className="note warn">No company has been set up yet. Ask your administrator to add one in Settings.</div>
      </AppShell>
    );
  }

  const weeks = weeksOfMonth(ym);
  const weekIndex = sp.w !== undefined ? Number(sp.w) : weeks[0]?.i ?? 0;
  const wk = weeks.find((w) => w.i === weekIndex) ?? weeks[0];

  const [employees, weeksByEmp] = await Promise.all([getEmployees(company.id, { activeOnly: true }), getWeekTimesheetsForCompanyMonth(company.id, ym)]);
  const companyConfig = toCompanyConfig(company);

  const rows = employees
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => {
      const weekTs = (weeksByEmp.get(e.id) ?? weeks.map((w) => EMPTY_WEEK(w.i)))[weekIndex] ?? EMPTY_WEEK(weekIndex);
      const calc = calcWeek(
        companyConfig,
        { id: e.id, name: e.name, dob: e.dob, res: e.res, prDate: e.prDate, salary: e.salary, pattern: e.pattern, otElig: e.otElig, otMult: e.otMult, cdacOn: e.cdacOn, cdacAmt: e.cdacAmt ?? 0, levyAmt: 0 },
        ym,
        wk,
        weekTs,
        [],
        []
      );
      return { emp: e, ts: weekTs, calc };
    });

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>MC &amp; leave</h1>
          <div className="sub">Key in medical, paid and unpaid leave. This never touches overtime, allowances or pay rates.</div>
        </div>
      </div>

      <div className="card">
        <div className="bd stack">
          <form method="get" className="flex items-end gap-4 flex-wrap">
            <label className="f" style={{ maxWidth: 170 }}>
              <span>Month</span>
              <input className="inp" type="month" name="ym" defaultValue={ym} />
            </label>
            <div>
              <div className="hint" style={{ marginBottom: 6 }}>Week</div>
              <div className="weekrow" role="group" aria-label="Week">
                {weeks.map((w) => (
                  <Link key={w.i} href={`/leave?ym=${ym}&w=${w.i}`} className={w.i === weekIndex ? "on" : ""} title={w.range} prefetch>
                    {w.label}
                  </Link>
                ))}
              </div>
            </div>
            <noscript>
              <button className="btn sm" type="submit">Go</button>
            </noscript>
          </form>

          <div className="note info">
            Showing <b>{wk.range}</b>. MC and paid leave don&apos;t change anyone&apos;s pay — they&apos;re recorded for the record. Unpaid leave automatically reduces that week&apos;s pay.
          </div>

          {!rows.length ? (
            <div className="empty">No active employees yet.</div>
          ) : (
            <form action={saveLeaveAction} className="stack">
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="ym" value={ym} />
              <input type="hidden" name="weekIndex" value={weekIndex} />
              <input type="hidden" name="employeeIds" value={rows.map((r) => r.emp.id).join(",")} />
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th className="n">Days this week</th>
                      <th className="n">MC (paid)</th>
                      <th className="n">Leave (paid)</th>
                      <th className="n">Unpaid leave</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ emp, ts, calc }) => (
                      <tr key={emp.id}>
                        <td>
                          <div className="strong">{emp.name}</div>
                          <div className="hint">{emp.empNo}</div>
                        </td>
                        <td className="n">
                          {n2(calc.days)} <span className="hint">/ {n2(calc.stdWeek)}</span>
                        </td>
                        <td className="n">
                          <input className="inp num" type="number" step="0.5" min="0" name={`mc_${emp.id}`} defaultValue={ts.mc || ""} style={{ width: 90 }} aria-label={`${emp.name} — MC`} />
                        </td>
                        <td className="n">
                          <input className="inp num" type="number" step="0.5" min="0" name={`pl_${emp.id}`} defaultValue={ts.pl || ""} style={{ width: 90 }} aria-label={`${emp.name} — paid leave`} />
                        </td>
                        <td className="n">
                          <input className="inp num" type="number" step="0.5" min="0" name={`ul_${emp.id}`} defaultValue={ts.ul || ""} style={{ width: 90 }} aria-label={`${emp.name} — unpaid leave`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <button className="btn pri" type="submit">
                  Save leave for {wk.label}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
