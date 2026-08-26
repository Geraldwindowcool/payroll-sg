import AppShell from "@/components/AppShell";
import { getActiveCompany } from "@/lib/activeCompany";
import Link from "next/link";

/** The landing hub shown right after an administrator logs in — this is
 *  what src/proxy.ts already redirects ADMIN sessions to, so nothing there
 *  needed to change. No tab bar here (see AppShell) since neither
 *  workspace has been picked yet. */
export default async function AdminHub() {
  const company = await getActiveCompany();

  return (
    <AppShell active="/admin">
      <div className="page-head">
        <div>
          <div className="eyebrow">{company?.name ?? "Window-Cool"}</div>
          <h1>What would you like to do?</h1>
        </div>
      </div>

      <div className="hub-cards">
        <Link href="/admin/payroll" className="card hub-card">
          <div className="bd">
            <div className="hub-card-icon" aria-hidden="true">💰</div>
            <h2>Payroll</h2>
            <div className="sub">Employees, timesheets, pay runs, CPF, payslips and bank files.</div>
          </div>
        </Link>
        <Link href="/admin/budget" className="card hub-card">
          <div className="bd">
            <div className="hub-card-icon" aria-hidden="true">📊</div>
            <h2>Budget</h2>
            <div className="sub">Income, expenses and cashflow for the whole business.</div>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
