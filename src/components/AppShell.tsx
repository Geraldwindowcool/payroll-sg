import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCompanies } from "@/lib/payrollService";
import { getActiveCompany } from "@/lib/activeCompany";
import { switchCompanyAction } from "@/app/actions/company";
import { signOutAction } from "@/app/actions/auth";

const ADMIN_TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/allowances", label: "Allowances" },
  { href: "/admin/timesheet", label: "Timesheet" },
  { href: "/admin/payrun", label: "Pay run" },
  { href: "/admin/payslips", label: "Payslips" },
  { href: "/admin/bank", label: "Bank file" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const companies = await getCompanies();
  const activeCompany = await getActiveCompany();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="container flex items-center gap-4 flex-wrap" style={{ padding: "10px 20px" }}>
          <Link href={isAdmin ? "/admin" : "/leave"} className="flex items-center gap-2" style={{ textDecoration: "none" }}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold" style={{ background: "var(--ink)", color: "#fff" }}>
              PS
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink)", lineHeight: 1.1 }}>Payroll SG</div>
              <div className="hint" style={{ fontSize: 10.5, letterSpacing: "0.04em" }}>SINGAPORE PAYROLL</div>
            </div>
          </Link>

          {companies.length > 0 && (
            <form action={switchCompanyAction} className="flex items-center gap-2">
              <select className="inp" name="companyId" defaultValue={activeCompany?.id} onChange={(e) => e.currentTarget.form?.requestSubmit()} style={{ width: "auto", maxWidth: 240 }} aria-label="Active company">
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <noscript>
                <button className="btn sm" type="submit">Switch</button>
              </noscript>
            </form>
          )}

          <div className="flex-1" />

          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right" style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                <span className={`pill ${isAdmin ? "blue" : "gray"}`}>{isAdmin ? "Administrator" : "Staff"}</span>
              </div>
              <form action={signOutAction}>
                <button className="btn sm" type="submit">Sign out</button>
              </form>
            </div>
          )}
        </div>
        {isAdmin && (
          <nav className="tabs container" aria-label="Payroll sections">
            {ADMIN_TABS.map((t) => (
              <Link key={t.href} href={t.href} className={active === t.href ? "on" : ""}>
                {t.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1">
        <div className="container" style={{ padding: "24px 20px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
