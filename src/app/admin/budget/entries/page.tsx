import AppShell from "@/components/AppShell";
import MonthPicker from "@/components/MonthPicker";
import SubmitButton from "@/components/SubmitButton";
import { getActiveCompany } from "@/lib/activeCompany";
import { getBudgetCategories, getBudgetEntriesForMonth } from "@/lib/budgetService";
import { money } from "@/lib/payroll";
import { createBudgetEntryAction, updateBudgetEntryAction, deleteBudgetEntryAction } from "@/app/actions/budget";
import Link from "next/link";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function BudgetEntriesPage({ searchParams }: { searchParams: Promise<{ ym?: string }> }) {
  const sp = await searchParams;
  const ym = sp.ym || thisMonth();
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/budget/entries">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  const categories = await getBudgetCategories(company.id);
  if (!categories.length) {
    return (
      <AppShell active="/admin/budget/entries">
        <div className="note warn">No budget categories yet — <Link href="/admin/budget">set them up from the Budget dashboard</Link> first.</div>
      </AppShell>
    );
  }

  // The system Payroll row never takes manual entries — its figure always
  // comes live from real payroll data, shown on the Dashboard.
  const loggable = categories.filter((c) => !c.isSystem);
  const entries = await getBudgetEntriesForMonth(company.id, ym);
  const entriesByCategory = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = entriesByCategory.get(e.categoryId) ?? [];
    list.push(e);
    entriesByCategory.set(e.categoryId, list);
  }

  return (
    <AppShell active="/admin/budget/entries">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Income &amp; expenses</h1>
          <div className="sub">Log what actually came in and went out this month, by category. Payroll is tracked automatically — see the Dashboard.</div>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card">
          <div className="bd">
            <MonthPicker ym={ym} basePath="/admin/budget/entries" />
          </div>
        </div>

        {loggable.map((cat) => {
          const catEntries = entriesByCategory.get(cat.id) ?? [];
          const total = catEntries.reduce((s, e) => s + e.amount, 0);
          return (
            <div className="card" key={cat.id}>
              <div className="hd">
                <h2>{cat.name}</h2>
                <span className={`pill ${cat.type === "INCOME" ? "blue" : "gray"}`}>{cat.type === "INCOME" ? "Income" : "Expense"}</span>
                <span className="hint">{money(total)} this month</span>
              </div>
              <div className="bd stack">
                {catEntries.map((e) => (
                  <form key={e.id} action={updateBudgetEntryAction} className="stack" style={{ paddingBottom: "var(--sp-4)", borderBottom: "1px solid var(--line)" }}>
                    <input type="hidden" name="id" value={e.id} />
                    <div className="fields tight">
                      <label className="f"><span>Amount ($)</span><input className="inp num" type="number" step="0.01" name="amount" defaultValue={e.amount} /></label>
                      <label className="f"><span>Description</span><input className="inp" name="description" defaultValue={e.description} placeholder="What was this for?" /></label>
                    </div>
                    <div className="flex items-center gap-2">
                      <SubmitButton className="btn sm" action={updateBudgetEntryAction}>Save</SubmitButton>
                      <SubmitButton className="btn sm danger" action={deleteBudgetEntryAction} pendingText="Deleting…">Delete</SubmitButton>
                    </div>
                  </form>
                ))}
                {!catEntries.length && <div className="empty">No entries yet for {ym}.</div>}
              </div>
            </div>
          );
        })}

        <div className="card">
          <div className="hd"><h2>Add an entry</h2></div>
          <div className="bd">
            <form action={createBudgetEntryAction} className="fields tight items-end">
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="ym" value={ym} />
              <label className="f"><span>Category</span>
                <select className="inp" name="categoryId" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  <optgroup label="Income">
                    {loggable.filter((c) => c.type === "INCOME").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Expenses">
                    {loggable.filter((c) => c.type === "EXPENSE").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
              </label>
              <label className="f"><span>Amount ($)</span><input className="inp num" type="number" step="0.01" name="amount" required /></label>
              <label className="f"><span>Description</span><input className="inp" name="description" placeholder="What was this for?" /></label>
              <SubmitButton>Add</SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
