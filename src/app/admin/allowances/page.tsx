import AppShell from "@/components/AppShell";
import { getActiveCompany } from "@/lib/activeCompany";
import { getAllowances } from "@/lib/payrollService";
import { createAllowanceAction, updateAllowanceAction, deleteAllowanceAction } from "@/app/actions/allowances";

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
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 26 }}>Allowances</h1>
        <span className="hint">{company.name} — extra pay lines like scaffolding, height work, or an attendance bonus, added on top of basic pay.</span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="bd">
          {allowances.map((a) => (
            <form key={a.id} action={updateAllowanceAction} className="flex items-center gap-2 flex-wrap" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <input type="hidden" name="id" value={a.id} />
              <input className="inp" name="name" defaultValue={a.name} style={{ maxWidth: 200 }} />
              <select className="inp" name="basis" defaultValue={a.basis} style={{ maxWidth: 130 }}>
                <option value="DAY">Per day</option>
                <option value="HOUR">Per hour</option>
                <option value="FIXED">Fixed / month</option>
              </select>
              <input className="inp num" type="number" step="0.01" name="rate" defaultValue={a.rate} style={{ maxWidth: 110 }} />
              <label className="chk"><input type="checkbox" name="cpfPayable" defaultChecked={a.cpfPayable} /> CPF-payable</label>
              <button className="btn sm" type="submit">Save</button>
              <button className="btn sm danger" type="submit" formAction={deleteAllowanceAction}>Delete</button>
            </form>
          ))}
          {!allowances.length && <div className="hint" style={{ padding: "10px 0" }}>No allowances yet — add one below.</div>}
        </div>
      </div>

      <div className="card">
        <div className="hd"><h2 style={{ fontSize: 16 }}>Add an allowance</h2></div>
        <div className="bd">
          <form action={createAllowanceAction} className="flex items-center gap-2 flex-wrap">
            <input type="hidden" name="companyId" value={company.id} />
            <input className="inp" name="name" placeholder="e.g. Scaffolding" required style={{ maxWidth: 200 }} />
            <select className="inp" name="basis" defaultValue="DAY" style={{ maxWidth: 130 }}>
              <option value="DAY">Per day</option>
              <option value="HOUR">Per hour</option>
              <option value="FIXED">Fixed / month</option>
            </select>
            <input className="inp num" type="number" step="0.01" name="rate" placeholder="Rate ($)" required style={{ maxWidth: 110 }} />
            <label className="chk"><input type="checkbox" name="cpfPayable" defaultChecked /> CPF-payable</label>
            <button className="btn pri" type="submit">Add</button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
