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
      <div className="page-head">
        <div>
          <div className="eyebrow">{company.name} — {new Date(ym + "-01").toLocaleString("en-SG", { month: "long", year: "numeric" })}</div>
          <h1>This month, at a glance.</h1>
        </div>
      </div>

      <div className="stack-lg">
        <div className="stats">
          <Stat k="Active employees" v={String(activeCount)} m="on the payroll" />
          <Stat k="Gross this month" v={money0(gross)} m={ym} />
          <Stat k="Net to pay" v={money0(net)} m="after employee CPF" />
          <Stat k="Total cost to company" v={money0(cost)} m="incl. employer CPF, SDL, levy" accent />
        </div>

        <div className="card">
          <div className="hd">
            <h2>Start here</h2>
          </div>
          <div className="bd checklist">
            {checklist.map((c, i) => (
              <div key={i} className="row">
                <span className={`num ${c.done ? "green" : "gray"}`}>{c.done ? "✓" : i + 1}</span>
                <span className="flex-1">{c.label}</span>
                <Link href={c.href} className="btn sm">
                  Go
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ k, v, m, accent }: { k: string; v: string; m: string; accent?: boolean }) {
  return (
    <div className={`stat ${accent ? "accent" : ""}`}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      <div className="m">{m}</div>
    </div>
  );
}
