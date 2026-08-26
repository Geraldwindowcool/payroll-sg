import AppShell from "@/components/AppShell";
import { getActiveCompany } from "@/lib/activeCompany";
import { getBudgetCategories, getBudgetSummaryForMonth, getBudgetSummaryForYear } from "@/lib/budgetService";
import { getXeroConnection } from "@/lib/xero";
import { money, money0 } from "@/lib/payroll";
import { seedDefaultCategoriesAction } from "@/app/actions/budget";
import { refreshRevenueFromXeroAction } from "@/app/actions/xero";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Variance is framed as "good news / bad news" rather than a raw
 *  over/under so it can be shown as one plain-language pill: an expense
 *  category is doing well when it comes in under its target, an income
 *  category is doing well when it meets or beats its target. */
function VariancePill({ type, target, actual }: { type: "INCOME" | "EXPENSE"; target: number | null; actual: number }) {
  if (target === null) return <span className="pill gray">No target</span>;
  const diff = type === "EXPENSE" ? target - actual : actual - target;
  if (Math.abs(diff) < 0.005) return <span className="pill gray">On target</span>;
  const good = diff > 0;
  return <span className={`pill ${good ? "green" : "red"}`}>{good ? "+" : "−"}{money(Math.abs(diff))}</span>;
}

export default async function BudgetDashboard({ searchParams }: { searchParams: Promise<{ year?: string; xeroError?: string; xeroSynced?: string }> }) {
  const sp = await searchParams;
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/budget">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  const categories = await getBudgetCategories(company.id);
  if (!categories.length) {
    return (
      <AppShell active="/admin/budget">
        <div className="page-head">
          <div>
            <div className="eyebrow">{company.name}</div>
            <h1>Budget</h1>
          </div>
        </div>
        <div className="card">
          <div className="bd stack">
            <p>Set up a starting list of budget categories — rent, marketing, insurance and so on — plus a Payroll category that tracks your real payroll cost automatically. You can rename, retarget or add more anytime from Categories.</p>
            <form action={seedDefaultCategoriesAction}>
              <input type="hidden" name="companyId" value={company.id} />
              <SubmitButton>Set up default categories</SubmitButton>
            </form>
          </div>
        </div>
      </AppShell>
    );
  }

  const ym = thisMonth();
  const year = Number(sp.year) || new Date().getFullYear();
  const [summary, yearTotals, xeroConnection] = await Promise.all([
    getBudgetSummaryForMonth(company.id, ym),
    getBudgetSummaryForYear(company.id, year),
    getXeroConnection(company.id),
  ]);

  const payrollCategory = summary.categories.find((c) => c.isSystem);
  const payrollCost = payrollCategory?.actual ?? 0;
  const otherExpense = summary.expense - payrollCost;
  const yearTotal = yearTotals.reduce((s, m) => ({ income: s.income + m.income, expense: s.expense + m.expense, net: s.net + m.net }), { income: 0, expense: 0, net: 0 });
  const incomeCategories = categories.filter((c) => c.type === "INCOME");

  return (
    <AppShell active="/admin/budget">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name} — {new Date(ym + "-01").toLocaleString("en-SG", { month: "long", year: "numeric" })}</div>
          <h1>Budget, at a glance.</h1>
        </div>
      </div>

      <div className="stack-lg">
        {sp.xeroSynced && <div className="note good">Synced {money(Number(sp.xeroSynced))} of revenue from Xero into {ym}.</div>}
        {sp.xeroError && <div className="note bad">Xero: {sp.xeroError}</div>}

        <div className="card">
          <div className="hd"><h2>Sync revenue from Xero</h2></div>
          <div className="bd">
            {!xeroConnection ? (
              <div className="note warn">Not connected to Xero yet — <Link href="/admin/settings">connect it in Settings</Link> to enable this.</div>
            ) : !incomeCategories.length ? (
              <div className="note warn">No income category to sync into yet — add one in Categories.</div>
            ) : (
              <form action={refreshRevenueFromXeroAction} className="flex items-end gap-3 flex-wrap">
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="ym" value={ym} />
                <label className="f" style={{ maxWidth: 260 }}>
                  <span>Into category</span>
                  <select className="inp" name="categoryId" defaultValue={incomeCategories[0].id}>
                    {incomeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <SubmitButton pendingText="Syncing…">Refresh from Xero — {xeroConnection.tenantName}</SubmitButton>
              </form>
            )}
          </div>
        </div>

        <div className="stats">
          <div className="stat accent">
            <div className="k">Net cashflow this month</div>
            <div className="v" style={{ color: summary.net >= 0 ? "var(--good)" : "var(--bad)" }}>{money0(summary.net)}</div>
            <div className="m">income − expenses</div>
          </div>
          <Stat k="Income this month" v={money0(summary.income)} m={ym} />
          <Stat k="Payroll cost this month" v={money0(payrollCost)} m="live from payroll" />
          <Stat k="Other expenses this month" v={money0(otherExpense)} m="excl. payroll" />
        </div>

        <div className="card">
          <div className="hd"><h2>Categories — {ym}</h2></div>
          <div className="tw">
            <table>
              <thead>
                <tr><th>Category</th><th>Type</th><th className="n">Budgeted</th><th className="n">Actual</th><th className="n">Variance</th></tr>
              </thead>
              <tbody>
                {summary.categories.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}{c.isSystem && <span className="hint"> · auto</span>}</td>
                    <td><span className={`pill ${c.type === "INCOME" ? "blue" : "gray"}`}>{c.type === "INCOME" ? "Income" : "Expense"}</span></td>
                    <td className="n">{c.target !== null ? money(c.target) : "—"}</td>
                    <td className="n">{money(c.actual)}</td>
                    <td className="n"><VariancePill type={c.type} target={c.target} actual={c.actual} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>Net this month</td><td className="n" colSpan={2}>{money(summary.net)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="hd">
            <h2>By month — {year}</h2>
            <form method="get" className="flex items-center gap-2">
              <input className="inp" type="number" name="year" defaultValue={year} style={{ width: 100 }} />
              <button className="btn sm" type="submit">Go</button>
            </form>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Month</th><th className="n">Income</th><th className="n">Expenses</th><th className="n">Net</th></tr></thead>
              <tbody>
                {yearTotals.map((m) => (
                  <tr key={m.ym}><td>{m.ym}</td><td className="n">{money(m.income)}</td><td className="n">{money(m.expense)}</td><td className="n">{money(m.net)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td>Total {year}</td><td className="n">{money(yearTotal.income)}</td><td className="n">{money(yearTotal.expense)}</td><td className="n">{money(yearTotal.net)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ k, v, m }: { k: string; v: string; m: string }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      <div className="m">{m}</div>
    </div>
  );
}
