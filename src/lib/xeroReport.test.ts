import { describe, it, expect } from "vitest";
import { parseTotalIncome, type XeroReportResponse } from "./xeroReport";

// Shaped like a real Xero ProfitAndLoss report response (Reports API v2.0).
// The Income section's numbers here match a real pull from Window-Cool's
// Xero org (Aug 2026 month-to-date) used to sanity-check this parser
// during development.
const REALISTIC_REPORT: XeroReportResponse = {
  Reports: [
    {
      Rows: [
        { RowType: "Header", Cells: [{ Value: "Profit and Loss" }] },
        {
          RowType: "Section",
          Title: "Income",
          Rows: [
            { RowType: "Row", Cells: [{ Value: "Andy Sales" }, { Value: "34096.00" }] },
            { RowType: "Row", Cells: [{ Value: "Danny Sales" }, { Value: "21679.00" }] },
            { RowType: "Row", Cells: [{ Value: "Gerald Sales" }, { Value: "18380.10" }] },
            { RowType: "Row", Cells: [{ Value: "Bernard/Boss Sales" }, { Value: "6510.00" }] },
            { RowType: "Row", Cells: [{ Value: "Sales" }, { Value: "84.00" }] },
            { RowType: "SummaryRow", Cells: [{ Value: "Total Income" }, { Value: "80749.10" }] },
          ],
        },
        {
          RowType: "Section",
          Title: "Less Cost of Sales",
          Rows: [{ RowType: "SummaryRow", Cells: [{ Value: "Total Cost of Sales" }, { Value: "14340.19" }] }],
        },
        {
          RowType: "Section",
          Title: "Gross Profit",
          Rows: [{ RowType: "SummaryRow", Cells: [{ Value: "Gross Profit" }, { Value: "66408.91" }] }],
        },
        {
          RowType: "Section",
          Title: "Operating Expenses",
          Rows: [{ RowType: "SummaryRow", Cells: [{ Value: "Total Operating Expenses" }, { Value: "11339.84" }] }],
        },
        {
          RowType: "Section",
          Title: "Net Profit",
          Rows: [{ RowType: "SummaryRow", Cells: [{ Value: "Net Profit" }, { Value: "55069.07" }] }],
        },
      ],
    },
  ],
};

describe("parseTotalIncome — reading Xero's raw P&L report shape", () => {
  it("finds the Income section's total regardless of how many other sections surround it", () => {
    expect(parseTotalIncome(REALISTIC_REPORT)).toBe(80749.1);
  });

  it("is not fooled by other sections whose titles don't say Income", () => {
    // "Gross Profit" and "Net Profit" both contain a plausible-looking
    // number too — make sure we specifically match "Income", not just any
    // summary row.
    const total = parseTotalIncome(REALISTIC_REPORT);
    expect(total).not.toBe(66408.91);
    expect(total).not.toBe(55069.07);
  });

  it("returns 0 for a report with no Income section", () => {
    expect(parseTotalIncome({ Reports: [{ Rows: [] }] })).toBe(0);
  });

  it("returns 0 for a completely empty/malformed response", () => {
    expect(parseTotalIncome({})).toBe(0);
  });

  it("finds Income even when it isn't the first section", () => {
    const shuffled: XeroReportResponse = { Reports: [{ Rows: [REALISTIC_REPORT.Reports![0].Rows![3], REALISTIC_REPORT.Reports![0].Rows![1]] }] };
    expect(parseTotalIncome(shuffled)).toBe(80749.1);
  });
});
