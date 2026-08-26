import AppShell from "@/components/AppShell";
import SubmitButton from "@/components/SubmitButton";
import { getActiveCompany } from "@/lib/activeCompany";
import { getBudgetCategories } from "@/lib/budgetService";
import { createBudgetCategoryAction, updateBudgetCategoryAction, deleteBudgetCategoryAction } from "@/app/actions/budget";

export default async function BudgetSettingsPage() {
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/budget/settings">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }

  const categories = await getBudgetCategories(company.id);

  return (
    <AppShell active="/admin/budget/settings">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Budget categories</h1>
          <div className="sub">The lines your budget is tracked against. Set a monthly target to see budget-vs-actual on the Dashboard, or leave it blank.</div>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card">
          <div className="bd">
            <div className="stack">
              {categories.map((c) => (
                <form key={c.id} action={updateBudgetCategoryAction} className="stack" style={{ paddingBottom: "var(--sp-4)", borderBottom: "1px solid var(--line)" }}>
                  <input type="hidden" name="id" value={c.id} />
                  {c.isSystem && <input type="hidden" name="isSystem" value="on" />}
                  <div className="fields tight">
                    {c.isSystem ? (
                      <>
                        <label className="f"><span>Name</span><input className="inp" value={c.name} disabled /></label>
                        <label className="f"><span>Type</span><input className="inp" value={c.type === "INCOME" ? "Income" : "Expense"} disabled /></label>
                      </>
                    ) : (
                      <>
                        <label className="f"><span>Name</span><input className="inp" name="name" defaultValue={c.name} /></label>
                        <label className="f"><span>Type</span>
                          <select className="inp" name="type" defaultValue={c.type}>
                            <option value="INCOME">Income</option>
                            <option value="EXPENSE">Expense</option>
                          </select>
                        </label>
                      </>
                    )}
                    <label className="f"><span>Monthly target ($)</span><input className="inp num" type="number" step="0.01" name="monthlyTarget" defaultValue={c.monthlyTarget ?? undefined} placeholder="No target" /></label>
                  </div>
                  <div className="flex items-center gap-2">
                    <SubmitButton className="btn sm" action={updateBudgetCategoryAction}>Save</SubmitButton>
                    {c.isSystem ? (
                      <span className="hint">Auto-calculated from real payroll — can&apos;t be deleted or renamed.</span>
                    ) : (
                      <SubmitButton className="btn sm danger" action={deleteBudgetCategoryAction} pendingText="Deleting…">Delete</SubmitButton>
                    )}
                  </div>
                </form>
              ))}
              {!categories.length && <div className="empty">No categories yet — add one below.</div>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>Add a category</h2></div>
          <div className="bd">
            <form action={createBudgetCategoryAction} className="fields tight items-end">
              <input type="hidden" name="companyId" value={company.id} />
              <label className="f"><span>Name</span><input className="inp" name="name" placeholder="e.g. Travel" required /></label>
              <label className="f"><span>Type</span>
                <select className="inp" name="type" defaultValue="EXPENSE">
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </label>
              <label className="f"><span>Monthly target ($)</span><input className="inp num" type="number" step="0.01" name="monthlyTarget" placeholder="No target" /></label>
              <SubmitButton>Add</SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
