import { describe, it, expect } from "vitest";
import { summarizeCashAdjustments } from "./payrollCashAdjustments";

describe("summarizeCashAdjustments — reconciling accrued payroll cost to actual cash", () => {
  it("returns the accrual figure unchanged when there are no adjustments", () => {
    const s = summarizeCashAdjustments(50000, []);
    expect(s.accrualPayrollCost).toBe(50000);
    expect(s.totalAdjustment).toBe(0);
    expect(s.trueCashPayrollCost).toBe(50000);
  });

  it("reduces true cash cost for a deferred draw (positive amount = less cash paid than accrued)", () => {
    const s = summarizeCashAdjustments(50000, [{ amount: 5000 }]);
    expect(s.totalAdjustment).toBe(5000);
    expect(s.trueCashPayrollCost).toBe(45000);
  });

  it("increases true cash cost for an absorbed cost-share (negative amount = more cash paid than accrued)", () => {
    const s = summarizeCashAdjustments(50000, [{ amount: -2000 }]);
    expect(s.totalAdjustment).toBe(-2000);
    expect(s.trueCashPayrollCost).toBe(52000);
  });

  it("sums multiple adjustments together", () => {
    const s = summarizeCashAdjustments(50000, [{ amount: 5000 }, { amount: -1000 }, { amount: 500 }]);
    expect(s.totalAdjustment).toBe(4500);
    expect(s.trueCashPayrollCost).toBe(45500);
  });

  it("never mutates the accrual figure itself — it's always reported as given", () => {
    const s = summarizeCashAdjustments(50000, [{ amount: 999999 }]);
    expect(s.accrualPayrollCost).toBe(50000);
  });
});
