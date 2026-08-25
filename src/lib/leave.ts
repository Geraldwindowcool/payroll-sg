// Turning individual leave DATES into the per-week day COUNTS the payroll
// engine works with. Pure functions, no I/O — the same reason src/lib/payroll.ts
// is structured this way, so the arithmetic that decides people's pay can be
// unit tested directly.

import { dayWeight, weeksOfMonth } from "./payroll";

export type LeaveType = "MC" | "PL" | "UL";

export type LeaveDayEntry = {
  date: string; // ISO "YYYY-MM-DD"
  type: LeaveType;
  half: boolean;
};

export type WeekLeaveTotals = { mc: number; pl: number; ul: number };

/** How many working days one leave entry is worth for an employee on the
 *  given work pattern. A date the employee never works (Sunday on any
 *  pattern, Saturday on a 5-day week) is worth 0 — marking it as leave
 *  shouldn't invent a day that was never going to be worked. Saturdays on
 *  a 5.5-day week are already half a working day, so a "half day" marked
 *  on one is a quarter day. */
export function leaveDayValue(entry: LeaveDayEntry, pattern: number): number {
  const d = new Date(`${entry.date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  const full = dayWeight(d, pattern);
  return entry.half ? full / 2 : full;
}

/** Which week index of its month a date falls in, matching weeksOfMonth().
 *  Returns -1 if the date isn't in that month at all. */
export function weekIndexOfDate(ym: string, date: string): number {
  const [y, m] = ym.split("-").map(Number);
  const [dy, dm, dd] = date.split("-").map(Number);
  if (dy !== y || dm !== m) return -1;
  const week = weeksOfMonth(ym).find((w) => dd >= w.from && dd <= w.to);
  return week ? week.i : -1;
}

/** Per-week MC / paid-leave / unpaid-leave day counts for one employee's
 *  month, derived from their individual leave dates. Index-aligned with
 *  weeksOfMonth(ym), so the result drops straight into the mc/pl/ul columns
 *  on timesheet_weeks that calcWeek() already reads. */
export function deriveWeekLeaveTotals(ym: string, entries: LeaveDayEntry[], pattern: number): WeekLeaveTotals[] {
  const totals: WeekLeaveTotals[] = weeksOfMonth(ym).map(() => ({ mc: 0, pl: 0, ul: 0 }));
  for (const entry of entries) {
    const i = weekIndexOfDate(ym, entry.date);
    if (i < 0 || i >= totals.length) continue;
    const value = leaveDayValue(entry, pattern);
    if (!value) continue;
    if (entry.type === "MC") totals[i].mc += value;
    else if (entry.type === "PL") totals[i].pl += value;
    else totals[i].ul += value;
  }
  return totals;
}

/** Whole-month totals, for the "X of Y days used" balance summary. */
export function sumLeaveTotals(weekly: WeekLeaveTotals[]): WeekLeaveTotals {
  return weekly.reduce((s, w) => ({ mc: s.mc + w.mc, pl: s.pl + w.pl, ul: s.ul + w.ul }), { mc: 0, pl: 0, ul: 0 });
}
