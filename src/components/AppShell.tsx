import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { getCompanies } from "@/lib/payrollService";
import { getActiveCompany } from "@/lib/activeCompany";
import { signOutAction } from "@/app/actions/auth";
import CompanySwitcher from "@/components/CompanySwitcher";

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

const STAFF_TABS = [
  { href: "/attendance", label: "Attendance & MC" },
  { href: "/leave", label: "MC & leave only" },
];

export default async function AppShell({ children, active }: { children: React.ReactNode; active?: string }) {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const companies = await getCompanies();
  const activeCompany = await getActiveCompany();

  return (
    <div className="min-h-screen flex flex-col">
      <header style={{ position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)" }}>
        <div className="container flex items-center gap-4 flex-wrap" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <Link href={isAdmin ? "/admin" : "/attendance"} className="flex items-center gap-3" style={{ textDecoration: "none" }}>
            <Image src="/window-cool-logo.png" alt="Window-Cool" width={173} height={34} priority style={{ height: 30, width: "auto" }} />
            <div>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 17, color: "var(--ink)", lineHeight: 1.15 }}>Payroll</div>
              <div className="hint" style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>Singapore payroll</div>
            </div>
          </Link>

          <CompanySwitcher companies={companies} activeId={activeCompany?.id} />

          <div className="flex-1" />

          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right" style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                <span className={`pill ${isAdmin ? "blue" : "gray"}`}>{isAdmin ? "Administrator" : "Staff"}</span>
              </div>
              <form action={signOutAction}>
                <button className="btn sm" type="submit">Sign out</button>
              </form>
            </div>
          )}
        </div>
        {user && (
          <nav className="tabs container" aria-label="Payroll sections">
            {(isAdmin ? ADMIN_TABS : STAFF_TABS).map((t) => (
              <Link key={t.href} href={t.href} className={active === t.href ? "on" : ""}>
                {t.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1">
        <div className="container" style={{ paddingTop: "var(--sp-6)", paddingBottom: "var(--sp-8)" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
