import "server-only";
import { db } from "@/db";
import { leaveDays, timesheetWeeks } from "@/db/schema";
import { and, eq, like } from "drizzle-orm";
import {
  deriveWeekLeaveTotals,
  type LeaveDayEntry,
  type LeaveType,
} from "@/lib/leave";
import { weeksOfMonth } from "@/lib/payroll";

const VALID_TYPES: LeaveType[] = ["MC", "PL", "UL"];

/** Parses the LeaveCalendar's hidden field — "YYYY-MM-DD:TYPE:half"
 *  entries, comma separated. Anything malformed or outside the month is
 *  dropped rather than trusted, since this arrives from the browser. */
export function parseLeaveDaysField(raw: string, ym: string): LeaveDayEntry[] {
  const seen = new Set<string>();
  const out: LeaveDayEntry[] = [];
  for (const chunk of raw.split(",")) {
    const part = chunk.trim();
    if (!part) continue;
    const [date, type, half] = part.split(":");
    if (!date || !type) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!date.startsWith(`${ym}-`)) continue;
    if (!VALID_TYPES.includes(type as LeaveType)) continue;
    if (seen.has(date)) continue; // one entry per date wins — matches the DB's unique index
    seen.add(date);
    out.push({ date, type: type as LeaveType, half: half === "1" });
  }
  return out;
}

/** Replaces one employee's leave dates for one month, then rewrites that
 *  month's mc/pl/ul totals on timesheet_weeks to match — the payroll
 *  engine reads those week counts, so they must stay derived from the
 *  dates rather than drifting apart from them.
 *
 *  Only touches the mc/pl/ul columns: days/ot/xot/rdS/rdF/ph/allowanceQty
 *  on the same rows are left exactly as they were, so saving the calendar
 *  can never quietly wipe someone's overtime. */
export async function replaceLeaveDaysForMonth(opts: {
  companyId: string;
  employeeId: string;
  ym: string;
  pattern: number;
  entries: LeaveDayEntry[];
  userId?: string;
}) {
  const { companyId, employeeId, ym, pattern, entries, userId } = opts;

  // The delete+insert pair below is naturally sequential (can't insert the
  // new dates until the old ones for this month are gone, or the unique
  // index on employeeId+date could collide with a date being moved between
  // types) — but everything after it does NOT depend on network latency
  // stacking up per week. One round trip to see what already exists, then
  // every week's write fires at once instead of waiting in a queue behind
  // the one before it.
  await db
    .delete(leaveDays)
    .where(
      and(
        eq(leaveDays.employeeId, employeeId),
        like(leaveDays.date, `${ym}-%`),
      ),
    );
  if (entries.length) {
    await db
      .insert(leaveDays)
      .values(
        entries.map((e) => ({
          companyId,
          employeeId,
          date: e.date,
          type: e.type,
          half: e.half,
          updatedByUserId: userId ?? null,
        })),
      );
  }

  const totals = deriveWeekLeaveTotals(ym, entries, pattern);
  const weeks = weeksOfMonth(ym);

  const existingRows = await db
    .select({ id: timesheetWeeks.id, weekIndex: timesheetWeeks.weekIndex })
    .from(timesheetWeeks)
    .where(
      and(eq(timesheetWeeks.employeeId, employeeId), eq(timesheetWeeks.ym, ym)),
    );
  const existingByWeek = new Map(existingRows.map((r) => [r.weekIndex, r.id]));

  await Promise.all(
    weeks.map((w, i) => {
      const { mc, pl, ul } = totals[i];
      const existingId = existingByWeek.get(w.i);
      if (existingId) {
        return db
          .update(timesheetWeeks)
          .set({
            mc,
            pl,
            ul,
            updatedByUserId: userId ?? null,
            updatedAt: new Date(),
          })
          .where(eq(timesheetWeeks.id, existingId));
      }
      if (mc || pl || ul) {
        // Only create a row when there's actually leave to record — no point
        // filling the table with empty weeks for every month anyone views.
        return db
          .insert(timesheetWeeks)
          .values({
            companyId,
            employeeId,
            ym,
            weekIndex: w.i,
            mc,
            pl,
            ul,
            updatedByUserId: userId ?? null,
          });
      }
      return Promise.resolve();
    }),
  );
}
