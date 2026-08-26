import "server-only";
import { db } from "@/db";
import { payrollCashAdjustments, type PayrollCashAdjustment } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getCashAdjustmentsForMonth(companyId: string, ym: string): Promise<PayrollCashAdjustment[]> {
  return db
    .select()
    .from(payrollCashAdjustments)
    .where(and(eq(payrollCashAdjustments.companyId, companyId), eq(payrollCashAdjustments.ym, ym)));
}
