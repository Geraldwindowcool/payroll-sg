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

function sectionTotal(section: XeroReportRow | undefined): number {
  const totalRow = section?.Rows?.find((r) => r.RowType === "SummaryRow");
  const valueCell = totalRow?.Cells?.[totalRow.Cells.length - 1]?.Value;
  const n = Number(valueCell);
  return Number.isFinite(n) ? n : 0;
}

export function parseTotalIncome(report: XeroReportResponse): number {
  const sections = report.Reports?.[0]?.Rows ?? [];
  const incomeSection = sections.find((r) => r.RowType === "Section" && /income/i.test(r.Title ?? "") && !/other income/i.test(r.Title ?? ""));
  return sectionTotal(incomeSection);
}

/** Expenses live in (at least) two sections Xero doesn't guarantee the
 *  naming of exactly — "Cost of Sales" and "Operating Expenses" are the
 *  common titles, sometimes prefixed "Less " — so this sums every section
 *  whose title looks like either, rather than a single named section. */
export function parseTotalExpenses(report: XeroReportResponse): number {
  const sections = report.Reports?.[0]?.Rows ?? [];
  const expenseSections = sections.filter((r) => r.RowType === "Section" && /cost of sales|expenses/i.test(r.Title ?? ""));
  return expenseSections.reduce((sum, section) => sum + sectionTotal(section), 0);
}
