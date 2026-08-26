// Reconciling accrued payroll cost against actual cash paid — pure
// functions, no I/O, same reasoning as src/lib/payroll.ts and
// src/lib/budget.ts.
//
// accrualPayrollCost is the real, compliance-grade figure (what CPF is
// actually filed on, from getMonthPayroll — never altered by this file).
// Adjustments only affect the separate "true cash" view: a positive
// amount means less cash actually left the business than the accrual
// implies (a deferred draw, or cost pushed out to another company via a
// secondment/cost-share); a negative amount means more cash actually
// left than the accrual implies (this company absorbed a cost that isn't
// on its own payroll books).

export interface PayrollCashAdjustmentAmount {
  amount: number;
}

export interface CashAdjustmentSummary {
  accrualPayrollCost: number;
  totalAdjustment: number;
  trueCashPayrollCost: number;
}

export function summarizeCashAdjustments(accrualPayrollCost: number, adjustments: PayrollCashAdjustmentAmount[]): CashAdjustmentSummary {
  const totalAdjustment = adjustments.reduce((s, a) => s + a.amount, 0);
  return {
    accrualPayrollCost,
    totalAdjustment,
    trueCashPayrollCost: accrualPayrollCost - totalAdjustment,
  };
}

export const PAYROLL_CASH_ADJUSTMENT_REASON_LABELS: Record<string, string> = {
  DEFERRED_DRAW: "Deferred owner's draw",
  UNPAID_LEAVE_CPF: "Unpaid leave — CPF & wage timing",
  COST_SHARE: "Cost-shared / secondment",
  OTHER: "Other",
};
