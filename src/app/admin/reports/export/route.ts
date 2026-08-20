import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { getCompany, getMonthPayroll } from "@/lib/payrollService";
import { getActiveCompanyId } from "@/lib/activeCompany";

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** GET /admin/reports/export?year=YYYY — a full year's payroll, one row per
 *  employee per month, as CSV. */
export async function GET(req: NextRequest) {
  await requireAdmin();
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const companyId = req.nextUrl.searchParams.get("companyId") || (await getActiveCompanyId());
  if (!companyId) return NextResponse.json({ error: "Missing company" }, { status: 400 });
  const company = await getCompany(companyId);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const header = ["Month", "Employee", "Emp No", "Gross", "CPF (EE)", "CPF (ER)", "SDL", "Levy", "Net", "Cost to company", "MC days", "Leave days", "Unpaid leave days"];
  const lines = [header.map(csvEscape).join(",")];

  for (const ym of months) {
    const rows = await getMonthPayroll(companyId, ym, { includeInactive: true });
    for (const r of rows) {
      lines.push(
        [ym, r.emp.name, r.empRow.empNo, r.gross.toFixed(2), r.cpf.ee.toFixed(2), r.cpf.er.toFixed(2), r.sdl.toFixed(2), r.levy.toFixed(2), r.net.toFixed(2), r.cost.toFixed(2), r.mc, r.pl, r.ul]
          .map((v) => csvEscape(String(v)))
          .join(",")
      );
    }
  }

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-report-${company.name.replace(/[^a-z0-9]+/gi, "-")}-${year}.csv"`,
    },
  });
}
