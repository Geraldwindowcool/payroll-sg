import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { getCompany, getMonthPayroll } from "@/lib/payrollService";
import { getActiveCompanyId } from "@/lib/activeCompany";

type BankCol = { on: boolean; head: string; f: string };

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** GET /admin/bank/export?ym=YYYY-MM — downloads a bulk-payment CSV using
 *  the company's configurable bank-column layout (see Settings). */
export async function GET(req: NextRequest) {
  await requireAdmin();
  const ym = req.nextUrl.searchParams.get("ym") || "";
  const companyId = req.nextUrl.searchParams.get("companyId") || (await getActiveCompanyId());
  if (!ym || !companyId) return NextResponse.json({ error: "Missing ym or company" }, { status: 400 });

  const company = await getCompany(companyId);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const rows = await getMonthPayroll(companyId, ym);
  const cols = (company.bankCols as unknown as BankCol[]).filter((c) => c.on);
  const today = new Date().toISOString().slice(0, 10);

  const values: Record<string, (r: (typeof rows)[number]) => string> = {
    name: (r) => r.emp.name,
    bankCode: (r) => r.empRow.bankCode,
    branchCode: (r) => r.empRow.branchCode,
    acct: (r) => r.empRow.acct,
    amount: (r) => r.net.toFixed(2),
    ccy: () => "SGD",
    payDate: () => today,
    payType: () => "SALARY",
    ref: () => company.ref || "SALARY",
  };

  const lines = [cols.map((c) => csvEscape(c.head)).join(",")];
  for (const r of rows) {
    if (!r.empRow.acct) continue; // skip employees with no bank account on file
    lines.push(cols.map((c) => csvEscape((values[c.f]?.(r) ?? "").toString())).join(","));
  }

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bank-file-${company.name.replace(/[^a-z0-9]+/gi, "-")}-${ym}.csv"`,
    },
  });
}
