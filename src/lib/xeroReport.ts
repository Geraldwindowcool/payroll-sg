// Parsing for Xero's raw Reports API responses — pure functions, no I/O,
// same reasoning as src/lib/payroll.ts and src/lib/budget.ts: this is the
// one piece of the Xero integration worth unit testing directly, since
// it's reading a deeply nested third-party JSON shape rather than our own
// data.
//
// Xero's Profit & Loss report returns a Rows/Sections/Cells tree rather
// than a flat total, and doesn't guarantee section ordering — so this
// finds the "Income" section by its own title and reads its total row,
// rather than assuming a fixed position.

export interface XeroReportCell {
  Value?: string;
}
export interface XeroReportRow {
  RowType?: string;
  Title?: string;
  Cells?: XeroReportCell[];
  Rows?: XeroReportRow[];
}
export interface XeroReportResponse {
  Reports?: { Rows?: XeroReportRow[] }[];
}

export function parseTotalIncome(report: XeroReportResponse): number {
  const sections = report.Reports?.[0]?.Rows ?? [];
  const incomeSection = sections.find((r) => r.RowType === "Section" && /income/i.test(r.Title ?? ""));
  const totalRow = incomeSection?.Rows?.find((r) => r.RowType === "SummaryRow");
  const valueCell = totalRow?.Cells?.[totalRow.Cells.length - 1]?.Value;
  const n = Number(valueCell);
  return Number.isFinite(n) ? n : 0;
}
