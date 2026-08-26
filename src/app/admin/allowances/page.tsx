import AppShell from "@/components/AppShell";
import SubmitButton from "@/components/SubmitButton";
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
            <div className="stack">
              {allowances.map((a) => (
                <form key={a.id} action={updateAllowanceAction} className="stack" style={{ paddingBottom: "var(--sp-4)", borderBottom: "1px solid var(--line)" }}>
                  <input type="hidden" name="id" value={a.id} />
                  <div className="fields tight">
                    <label className="f"><span>Name</span><input className="inp" name="name" defaultValue={a.name} /></label>
                    <label className="f"><span>Basis</span>
                      <select className="inp" name="basis" defaultValue={a.basis}>
                        <option value="DAY">Per day</option>
                        <option value="HOUR">Per hour</option>
                        <option value="FIXED">Fixed / month</option>
                      </select>
                    </label>
                    <label className="f"><span>Rate ($)</span><input className="inp num" type="number" step="0.01" name="rate" defaultValue={a.rate} /></label>
                    <label className="chk" style={{ alignSelf: "end", height: 38 }}><input type="checkbox" name="cpfPayable" defaultChecked={a.cpfPayable} /> CPF-payable</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <SubmitButton className="btn sm" action={updateAllowanceAction}>Save</SubmitButton>
                    <SubmitButton className="btn sm danger" action={deleteAllowanceAction} pendingText="Deleting…">Delete</SubmitButton>
                  </div>
                </form>
              ))}
              {!allowances.length && <div className="empty">No allowances yet — add one below.</div>}
            </div>
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
              <SubmitButton>Add</SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
