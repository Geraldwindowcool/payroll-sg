import AppShell from "@/components/AppShell";
import { getActiveCompany } from "@/lib/activeCompany";
import { getMonthPayroll, getEmployees } from "@/lib/payrollService";
import { money0 } from "@/lib/payroll";
import Link from "next/link";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminOverview() {
  const company = await getActiveCompany();
  if (!company) {
    return (
      <AppShell active="/admin">
        <div className="note warn">No company yet — add one from Settings.</div>
      </AppShell>
    );
  }

  const ym = thisMonth();
  const [rows, employees] = await Promise.all([getMonthPayroll(company.id, ym), getEmployees(company.id)]);
  const activeCount = employees.filter((e) => e.active).length;
  const gross = rows.reduce((s, r) => s + r.gross, 0);
  const net = rows.reduce((s, r) => s + r.net, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);

  const checklist = [
    { done: !!(company.name && company.acct), label: "Enter your company name and paying bank account", href: "/admin/settings" },
    { done: employees.length > 0, label: "Add your employees — salary, work pattern, residency, bank account", href: "/admin/employees" },
    { done: rows.some((r) => r.gross > 0), label: "Enter this month's days worked, overtime and allowance days", href: "/admin/timesheet" },
    { done: false, label: "Review the pay run, print payslips, download the bank file", href: "/admin/payrun" },
  ];

  return (
    <AppShell active="/admin">
      <div style={{ marginBottom: 24 }}>
        <div className="hint" style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 11, marginBottom: 8 }}>
          {company.name} — {new Date(ym + "-01").toLocaleString("en-SG", { month: "long", year: "numeric" })}
        </div>
        <h1 style={{ fontSize: 30, marginBottom: 6 }}>This month, at a glance.</h1>
      </div>

      <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Stat k="Active employees" v={String(activeCount)} m="on the payroll" />
        <Stat k="Gross this month" v={money0(gross)} m={ym} />
        <Stat k="Net to pay" v={money0(net)} m="after employee CPF" />
        <Stat k="Total cost to company" v={money0(cost)} m="incl. employer CPF, SDL, levy" accent />
      </div>

      <div className="card">
        <div className="hd">
          <h2 style={{ fontSize: 16 }}>Start here</h2>
        </div>
        <div className="bd">
          {checklist.map((c, i) => (
            <div key={i} className="flex items-center gap-3" style={{ padding: "10px 0", borderBottom: i < checklist.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span className={`pill ${c.done ? "green" : "gray"}`} style={{ minWidth: 20, textAlign: "center" }}>
                {c.done ? "✓" : i + 1}
              </span>
              <span style={{ flex: 1 }}>{c.label}</span>
              <Link href={c.href} className="btn sm">
                Go
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ k, v, m, accent }: { k: string; v: string; m: string; accent?: boolean }) {
  return (
    <div className="card" style={accent ? { borderColor: "var(--ink)" } : {}}>
      <div className="bd">
        <div className="hint" style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.06em" }}>{k}</div>
        <div style={{ fontSize: 24, fontFamily: "var(--font-serif)", margin: "4px 0" }}>{v}</div>
        <div className="hint" style={{ fontSize: 12 }}>{m}</div>
      </div>
    </div>
  );
}
