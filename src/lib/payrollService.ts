import "server-only";
import { cache } from "react";
import { db } from "@/db";
import {
  companies,
  employees,
  allowances,
  levies,
  employeeAllowances,
  timesheetWeeks,
  monthlyItems,
  type Company as CompanyRow,
  type Employee as EmployeeRow,
} from "@/db/schema";
import { and, eq, gte, like, lt, inArray } from "drizzle-orm";
import {
  CompanyConfig,
  EmployeeCalc,
  AllowanceDef,
  EmployeeAllowanceLink,
  WeekTimesheet,
  MonthlyItemCalc,
  EMPTY_WEEK,
  EMPTY_MONTHLY_ITEM,
  MonthResult,
  calcMonth,
  weeksOfMonth,
  calcWages,
  cpfCalc,
} from "@/lib/payroll";

export function toCompanyConfig(c: CompanyRow): CompanyConfig {
  return {
    hoursPerWeek: c.hoursPerWeek,
    otMult: c.otMult,
    sdlEnabled: c.sdlEnabled,
    roundNet: c.roundNet,
    cpf: c.cpf as unknown as CompanyConfig["cpf"],
  };
}

export function toEmployeeCalc(e: EmployeeRow, levyAmt: number): EmployeeCalc {
  return {
    id: e.id,
    name: e.name,
    dob: e.dob,
    res: e.res,
    prDate: e.prDate,
    salary: e.salary,
    pattern: e.pattern,
    otElig: e.otElig,
    otMult: e.otMult,
    cdacOn: e.cdacOn,
    cdacAmt: e.cdacAmt ?? 0,
    levyAmt: e.res === "FW" ? levyAmt : 0,
  };
}

// Cached per-request (React's cache()) — AppShell and the page it wraps
// both need the company list on every navigation, so without this every
// click would hit Postgres for the same rows two or three times over.
export const getCompanies = cache(async function getCompanies() {
  return db.select().from(companies).orderBy(companies.createdAt);
});

export async function getCompany(companyId: string) {
  const [c] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return c ?? null;
}

export async function getEmployees(companyId: string, opts: { activeOnly?: boolean } = {}) {
  const rows = await db.select().from(employees).where(eq(employees.companyId, companyId));
  return opts.activeOnly ? rows.filter((e) => e.active) : rows;
}

export async function getEmployee(employeeId: string) {
  const [e] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  return e ?? null;
}

export async function getAllowances(companyId: string): Promise<AllowanceDef[]> {
  const rows = await db.select().from(allowances).where(eq(allowances.companyId, companyId));
  return rows.map((a) => ({ id: a.id, name: a.name, basis: a.basis, rate: a.rate, cpfPayable: a.cpfPayable }));
}

export async function getLevies(companyId: string) {
  return db.select().from(levies).where(eq(levies.companyId, companyId));
}

export async function getEmployeeAllowanceLinks(employeeIds: string[]): Promise<Map<string, EmployeeAllowanceLink[]>> {
  if (!employeeIds.length) return new Map();
  const rows = await db.select().from(employeeAllowances).where(inArray(employeeAllowances.employeeId, employeeIds));
  const map = new Map<string, EmployeeAllowanceLink[]>();
  for (const r of rows) {
    const list = map.get(r.employeeId) ?? [];
    list.push({ allowanceId: r.allowanceId, rateOverride: r.rateOverride });
    map.set(r.employeeId, list);
  }
  return map;
}

/** Timesheet weeks for one employee, one month, index-aligned with weeksOfMonth(ym). */
export async function getWeekTimesheets(employeeId: string, ym: string): Promise<WeekTimesheet[]> {
  const rows = await db
    .select()
    .from(timesheetWeeks)
    .where(and(eq(timesheetWeeks.employeeId, employeeId), eq(timesheetWeeks.ym, ym)));
  const byIndex = new Map(rows.map((r) => [r.weekIndex, r]));
  return weeksOfMonth(ym).map((w) => {
    const r = byIndex.get(w.i);
    if (!r) return EMPTY_WEEK(w.i);
    return {
      weekIndex: w.i,
      days: r.days,
      ot: r.ot,
      xot: r.xot,
      rdS: r.rdS,
      rdF: r.rdF,
      ph: r.ph,
      mc: r.mc,
      pl: r.pl,
      ul: r.ul,
      allowanceQty: r.allowanceQty as Record<string, number>,
    };
  });
}

/** Timesheet weeks for every employee of a company for one month, keyed by employeeId. */
export async function getWeekTimesheetsForCompanyMonth(companyId: string, ym: string): Promise<Map<string, WeekTimesheet[]>> {
  const rows = await db
    .select()
    .from(timesheetWeeks)
    .where(and(eq(timesheetWeeks.companyId, companyId), eq(timesheetWeeks.ym, ym)));
  const byEmp = new Map<string, Map<number, (typeof rows)[number]>>();
  for (const r of rows) {
    const m = byEmp.get(r.employeeId) ?? new Map();
    m.set(r.weekIndex, r);
    byEmp.set(r.employeeId, m);
  }
  const weeks = weeksOfMonth(ym);
  const out = new Map<string, WeekTimesheet[]>();
  for (const [empId, byIndex] of byEmp) {
    out.set(
      empId,
      weeks.map((w) => {
        const r = byIndex.get(w.i);
        if (!r) return EMPTY_WEEK(w.i);
        return {
          weekIndex: w.i,
          days: r.days,
          ot: r.ot,
          xot: r.xot,
          rdS: r.rdS,
          rdF: r.rdF,
          ph: r.ph,
          mc: r.mc,
          pl: r.pl,
          ul: r.ul,
          allowanceQty: r.allowanceQty as Record<string, number>,
        };
      })
    );
  }
  return out;
}

export async function getMonthlyItem(employeeId: string, ym: string): Promise<MonthlyItemCalc & { paid: boolean }> {
  const [r] = await db
    .select()
    .from(monthlyItems)
    .where(and(eq(monthlyItems.employeeId, employeeId), eq(monthlyItems.ym, ym)))
    .limit(1);
  if (!r) return { ...EMPTY_MONTHLY_ITEM, paid: false };
  return { bonus: r.bonus, adj: r.adj, adjLbl: r.adjLbl, reimb: r.reimb, reimbLbl: r.reimbLbl, ded: r.ded, dedLbl: r.dedLbl, note: r.note, paid: r.paid };
}

export async function getMonthlyItemsForCompanyMonth(companyId: string, ym: string): Promise<Map<string, MonthlyItemCalc & { paid: boolean }>> {
  const rows = await db
    .select()
    .from(monthlyItems)
    .where(and(eq(monthlyItems.companyId, companyId), eq(monthlyItems.ym, ym)));
  const out = new Map<string, MonthlyItemCalc & { paid: boolean }>();
  for (const r of rows) {
    out.set(r.employeeId, { bonus: r.bonus, adj: r.adj, adjLbl: r.adjLbl, reimb: r.reimb, reimbLbl: r.reimbLbl, ded: r.ded, dedLbl: r.dedLbl, note: r.note, paid: r.paid });
  }
  return out;
}

type YtdTsRow = typeof timesheetWeeks.$inferSelect;
type YtdMoRow = typeof monthlyItems.$inferSelect;

/** Pure CPF-subject OW/AW accrual math for one employee, given the raw
 *  timesheet/monthly-item rows already filtered to that employee and to
 *  "yearStart <= ym < beforeThis". Split out of ytdBefore() so the batch
 *  path (getMonthPayroll) can fetch rows for the whole company once and
 *  reuse this same math per employee, instead of one DB round trip each. */
function ytdFromRows(
  company: CompanyConfig,
  emp: EmployeeCalc,
  allowanceDefs: AllowanceDef[],
  empAllowances: EmployeeAllowanceLink[],
  tsRows: YtdTsRow[],
  moRows: YtdMoRow[]
): { ow: number; aw: number } {
  if (!tsRows.length && !moRows.length) return { ow: 0, aw: 0 };

  const months = new Set([...tsRows.map((r) => r.ym), ...moRows.map((r) => r.ym)]);
  let ow = 0,
    aw = 0;
  for (const monthYm of Array.from(months).sort()) {
    const weeks = weeksOfMonth(monthYm).map((w) => {
      const r = tsRows.find((x) => x.ym === monthYm && x.weekIndex === w.i);
      if (!r) return EMPTY_WEEK(w.i);
      return {
        weekIndex: w.i,
        days: r.days,
        ot: r.ot,
        xot: r.xot,
        rdS: r.rdS,
        rdF: r.rdF,
        ph: r.ph,
        mc: r.mc,
        pl: r.pl,
        ul: r.ul,
        allowanceQty: r.allowanceQty as Record<string, number>,
      };
    });
    const mo = moRows.find((x) => x.ym === monthYm);
    const monthlyItem: MonthlyItemCalc = mo
      ? { bonus: mo.bonus, adj: mo.adj, adjLbl: mo.adjLbl, reimb: mo.reimb, reimbLbl: mo.reimbLbl, ded: mo.ded, dedLbl: mo.dedLbl, note: mo.note }
      : EMPTY_MONTHLY_ITEM;
    const w = calcWages(company, emp, monthYm, weeks, monthlyItem, allowanceDefs, empAllowances);
    const c = cpfCalc(company.cpf, emp, monthYm, w.ow, w.aw, ow, aw);
    ow += c.ow;
    aw += c.aw;
  }
  return { ow, aw };
}

/** CPF-subject OW/AW already accrued this calendar year, before the given month. */
export async function ytdBefore(
  company: CompanyConfig,
  emp: EmployeeCalc,
  ym: string,
  allowanceDefs: AllowanceDef[],
  empAllowances: EmployeeAllowanceLink[]
): Promise<{ ow: number; aw: number }> {
  const [y, m] = ym.split("-").map(Number);
  if (m <= 1) return { ow: 0, aw: 0 };

  const yearStart = `${y}-01`;
  const beforeThis = `${y}-${String(m).padStart(2, "0")}`;

  const [tsRows, moRows] = await Promise.all([
    db
      .select()
      .from(timesheetWeeks)
      .where(and(eq(timesheetWeeks.employeeId, emp.id), gte(timesheetWeeks.ym, yearStart), lt(timesheetWeeks.ym, beforeThis))),
    db
      .select()
      .from(monthlyItems)
      .where(and(eq(monthlyItems.employeeId, emp.id), gte(monthlyItems.ym, yearStart), lt(monthlyItems.ym, beforeThis))),
  ]);

  return ytdFromRows(company, emp, allowanceDefs, empAllowances, tsRows, moRows);
}

/** Same "year to date before this month" rows ytdBefore() fetches, but for
 *  every employee of a company in one pair of queries instead of one pair
 *  per employee — the query already hits the (companyId, ym) index used
 *  elsewhere, it's just scoped to the company rather than one employee. */
async function getYtdRawForCompanyMonth(companyId: string, ym: string): Promise<{ tsRows: YtdTsRow[]; moRows: YtdMoRow[] }> {
  const [y, m] = ym.split("-").map(Number);
  if (m <= 1) return { tsRows: [], moRows: [] };

  const yearStart = `${y}-01`;
  const beforeThis = `${y}-${String(m).padStart(2, "0")}`;

  const [tsRows, moRows] = await Promise.all([
    db
      .select()
      .from(timesheetWeeks)
      .where(and(eq(timesheetWeeks.companyId, companyId), gte(timesheetWeeks.ym, yearStart), lt(timesheetWeeks.ym, beforeThis))),
    db
      .select()
      .from(monthlyItems)
      .where(and(eq(monthlyItems.companyId, companyId), gte(monthlyItems.ym, yearStart), lt(monthlyItems.ym, beforeThis))),
  ]);
  return { tsRows, moRows };
}

export type MonthPayrollRow = MonthResult & { empRow: EmployeeRow };

/** Full monthly payroll for every active employee of a company. This is the
 *  main entry point used by the pay run, payslips, bank file and reports
 *  pages — everything downstream of the database lands here. */
export async function getMonthPayroll(companyId: string, ym: string, opts: { includeInactive?: boolean } = {}): Promise<MonthPayrollRow[]> {
  const companyRow = await getCompany(companyId);
  if (!companyRow) return [];
  const company = toCompanyConfig(companyRow);

  const [empRows, allowanceDefs, levyRows] = await Promise.all([getEmployees(companyId, { activeOnly: !opts.includeInactive }), getAllowances(companyId), getLevies(companyId)]);
  if (!empRows.length) return [];

  const levyById = new Map(levyRows.map((l) => [l.id, l.amt]));
  const empIds = empRows.map((e) => e.id);
  // One pair of company-wide queries for everyone's YTD figures, instead of
  // the old one-pair-per-employee loop below — that was the main reason
  // this page got slower as headcount grew, since each pair was a separate
  // network round trip to Postgres, done one employee at a time.
  const [linksByEmp, weeksByEmp, itemsByEmp, ytdRaw] = await Promise.all([
    getEmployeeAllowanceLinks(empIds),
    getWeekTimesheetsForCompanyMonth(companyId, ym),
    getMonthlyItemsForCompanyMonth(companyId, ym),
    getYtdRawForCompanyMonth(companyId, ym),
  ]);

  const results: MonthPayrollRow[] = empRows.map((empRow) => {
    const levyAmt = empRow.levyId ? levyById.get(empRow.levyId) ?? 0 : 0;
    const emp = toEmployeeCalc(empRow, levyAmt);
    const empAllowances = linksByEmp.get(empRow.id) ?? [];
    const weeks = weeksByEmp.get(empRow.id) ?? weeksOfMonth(ym).map((w) => EMPTY_WEEK(w.i));
    const monthlyItem = itemsByEmp.get(empRow.id) ?? { ...EMPTY_MONTHLY_ITEM, paid: false };
    const ytd = ytdFromRows(
      company,
      emp,
      allowanceDefs,
      empAllowances,
      ytdRaw.tsRows.filter((r) => r.employeeId === empRow.id),
      ytdRaw.moRows.filter((r) => r.employeeId === empRow.id)
    );
    const month = calcMonth(company, emp, ym, weeks, monthlyItem, ytd, allowanceDefs, empAllowances);
    return { ...month, empRow };
  });
  return results;
}

export async function getMonthPayrollForEmployee(employeeId: string, ym: string): Promise<MonthResult | null> {
  const empRow = await getEmployee(employeeId);
  if (!empRow) return null;
  const companyRow = await getCompany(empRow.companyId);
  if (!companyRow) return null;
  const company = toCompanyConfig(companyRow);

  const [allowanceDefs, levyRows, empAllowances, weeks, monthlyItem] = await Promise.all([
    getAllowances(empRow.companyId),
    getLevies(empRow.companyId),
    getEmployeeAllowanceLinks([employeeId]).then((m) => m.get(employeeId) ?? []),
    getWeekTimesheets(employeeId, ym),
    getMonthlyItem(employeeId, ym),
  ]);
  const levyAmt = empRow.levyId ? levyRows.find((l) => l.id === empRow.levyId)?.amt ?? 0 : 0;
  const emp = toEmployeeCalc(empRow, levyAmt);
  const ytd = await ytdBefore(company, emp, ym, allowanceDefs, empAllowances);
  return calcMonth(company, emp, ym, weeks, monthlyItem, ytd, allowanceDefs, empAllowances);
}

/** MC / paid-leave / unpaid-leave days taken so far in a calendar year, per
 *  employee — the balance side of each employee's alEntitlement/mcEntitlement.
 *  A basic version of the "leave balance" feature common to off-the-shelf
 *  HR apps (Talenox, Swingvy, HReasily, etc.). */
export async function getLeaveUsageForYear(companyId: string, year: number): Promise<Map<string, { mc: number; pl: number; ul: number }>> {
  const rows = await db
    .select()
    .from(timesheetWeeks)
    .where(and(eq(timesheetWeeks.companyId, companyId), like(timesheetWeeks.ym, `${year}-%`)));
  const out = new Map<string, { mc: number; pl: number; ul: number }>();
  for (const r of rows) {
    const cur = out.get(r.employeeId) ?? { mc: 0, pl: 0, ul: 0 };
    cur.mc += r.mc;
    cur.pl += r.pl;
    cur.ul += r.ul;
    out.set(r.employeeId, cur);
  }
  return out;
}

/** Every "YYYY-MM" that has any timesheet or monthly-item data for a company, newest first. */
export async function monthsWithData(companyId: string): Promise<string[]> {
  const [tsRows, moRows] = await Promise.all([
    db.selectDistinct({ ym: timesheetWeeks.ym }).from(timesheetWeeks).where(eq(timesheetWeeks.companyId, companyId)),
    db.selectDistinct({ ym: monthlyItems.ym }).from(monthlyItems).where(eq(monthlyItems.companyId, companyId)),
  ]);
  const set = new Set([...tsRows.map((r) => r.ym), ...moRows.map((r) => r.ym)]);
  return Array.from(set).sort().reverse();
}
