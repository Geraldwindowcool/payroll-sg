import AppShell from "@/components/AppShell";
import { getActiveCompany } from "@/lib/activeCompany";
import { getAllowances } from "@/lib/payrollService";
import { createAllowanceAction, updateAllowanceAction, deleteAllowanceAction } from "@/app/actions/allowances";

const ROW_COLS = "minmax(140px,2fr) minmax(110px,1fr) minmax(90px,1fr) auto auto auto";

export default async function AllowancesPage() {
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin/allowances">
        <div className="note warn">No company yet — add one from Settings first.</div>
      </AppShell>
    );
  }
  const allowances = await getAllowances(company.id);

  return (
    <AppShell active="/admin/allowances">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1>Allowances</h1>
          <div className="sub">Extra pay lines like scaffolding, height work, or an attendance bonus, added on top of basic pay.</div>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card">
          <div className="bd">
            {allowances.length > 0 && (
              <div className="hint" style={{ display: "grid", gridTemplateColumns: ROW_COLS, gap: 10, paddingBottom: 8, marginBottom: 4, borderBottom: "1px solid var(--line)" }}>
                <span>Name</span>
                <span>Basis</span>
                <span>Rate ($)</span>
                <span style={{ gridColumn: "span 3" }}>CPF-payable</span>
              </div>
            )}
            {allowances.map((a) => (
              <form key={a.id} action={updateAllowanceAction} className="items-center" style={{ display: "grid", gridTemplateColumns: ROW_COLS, gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <input type="hidden" name="id" value={a.id} />
                <input className="inp" name="name" defaultValue={a.name} />
                <select className="inp" name="basis" defaultValue={a.basis}>
                  <option value="DAY">Per day</option>
                  <option value="HOUR">Per hour</option>
                  <option value="FIXED">Fixed / month</option>
                </select>
                <input className="inp num" type="number" step="0.01" name="rate" defaultValue={a.rate} />
                <label className="chk"><input type="checkbox" name="cpfPayable" defaultChecked={a.cpfPayable} /></label>
                <button className="btn sm" type="submit">Save</button>
                <button className="btn sm danger" type="submit" formAction={deleteAllowanceAction}>Delete</button>
              </form>
            ))}
            {!allowances.length && <div className="empty">No allowances yet — add one below.</div>}
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>Add an allowance</h2></div>
          <div className="bd">
            <form action={createAllowanceAction} className="fields tight items-end">
              <input type="hidden" name="companyId" value={company.id} />
              <label className="f"><span>Name</span><input className="inp" name="name" placeholder="e.g. Scaffolding" required /></label>
              <label className="f"><span>Basis</span>
                <select className="inp" name="basis" defaultValue="DAY">
                  <option value="DAY">Per day</option>
                  <option value="HOUR">Per hour</option>
                  <option value="FIXED">Fixed / month</option>
                </select>
              </label>
              <label className="f"><span>Rate ($)</span><input className="inp num" type="number" step="0.01" name="rate" required /></label>
              <label className="chk" style={{ height: 40 }}><input type="checkbox" name="cpfPayable" defaultChecked /> CPF-payable</label>
              <button className="btn pri" type="submit">Add</button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
