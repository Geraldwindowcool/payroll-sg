import { describe, it, expect } from "vitest";
import { leaveDayValue, weekIndexOfDate, deriveWeekLeaveTotals, sumLeaveTotals, type LeaveDayEntry } from "./leave";

// July 2026 weeks (Monday-anchored, per weeksOfMonth):
//   W1 i=0: 1–5   (Wed–Sun)
//   W2 i=1: 6–12  (Mon–Sun)
//   W3 i=2: 13–19 (Mon–Sun)
//   W4 i=3: 20–26 (Mon–Sun)
//   W5 i=4: 27–31 (Mon–Fri)
// 2026-07-04 is a Saturday, 2026-07-05 a Sunday.
const YM = "2026-07";
const day = (date: string, type: LeaveDayEntry["type"] = "MC", half = false): LeaveDayEntry => ({ date, type, half });

describe("leaveDayValue — what one marked date is worth", () => {
  it("counts a normal weekday as a full day on every pattern", () => {
    expect(leaveDayValue(day("2026-07-01"), 5)).toBe(1);
    expect(leaveDayValue(day("2026-07-01"), 5.5)).toBe(1);
    expect(leaveDayValue(day("2026-07-01"), 6)).toBe(1);
  });

  it("halves a weekday when marked as a half day", () => {
    expect(leaveDayValue(day("2026-07-01", "MC", true), 5)).toBe(0.5);
  });

  it("ignores Sundays — nobody works them on any pattern", () => {
    expect(leaveDayValue(day("2026-07-05"), 5)).toBe(0);
    expect(leaveDayValue(day("2026-07-05"), 5.5)).toBe(0);
    expect(leaveDayValue(day("2026-07-05"), 6)).toBe(0);
  });

  it("treats Saturday per the work pattern", () => {
    expect(leaveDayValue(day("2026-07-04"), 5)).toBe(0); // 5-day week: not a working day
    expect(leaveDayValue(day("2026-07-04"), 5.5)).toBe(0.5); // 5.5-day week: half a working day
    expect(leaveDayValue(day("2026-07-04"), 6)).toBe(1); // 6-day week: a full working day
  });

  it("halves an already-half Saturday on a 5.5-day week", () => {
    expect(leaveDayValue(day("2026-07-04", "MC", true), 5.5)).toBe(0.25);
  });

  it("returns 0 for an unparseable date rather than throwing", () => {
    expect(leaveDayValue(day("not-a-date"), 5)).toBe(0);
  });
});

describe("weekIndexOfDate", () => {
  it("maps dates to the right Monday-anchored week", () => {
    expect(weekIndexOfDate(YM, "2026-07-01")).toBe(0);
    expect(weekIndexOfDate(YM, "2026-07-05")).toBe(0);
    expect(weekIndexOfDate(YM, "2026-07-06")).toBe(1);
    expect(weekIndexOfDate(YM, "2026-07-13")).toBe(2);
    expect(weekIndexOfDate(YM, "2026-07-26")).toBe(3);
    expect(weekIndexOfDate(YM, "2026-07-31")).toBe(4);
  });

  it("rejects dates outside the month", () => {
    expect(weekIndexOfDate(YM, "2026-06-30")).toBe(-1);
    expect(weekIndexOfDate(YM, "2026-08-01")).toBe(-1);
  });
});

describe("deriveWeekLeaveTotals", () => {
  it("returns one zeroed entry per week when there's no leave", () => {
    expect(deriveWeekLeaveTotals(YM, [], 5)).toEqual([
      { mc: 0, pl: 0, ul: 0 },
      { mc: 0, pl: 0, ul: 0 },
      { mc: 0, pl: 0, ul: 0 },
      { mc: 0, pl: 0, ul: 0 },
      { mc: 0, pl: 0, ul: 0 },
    ]);
  });

  it("files each type into the right week and column", () => {
    const out = deriveWeekLeaveTotals(
      YM,
      [day("2026-07-01", "MC"), day("2026-07-02", "PL"), day("2026-07-07", "UL")],
      5
    );
    expect(out[0]).toEqual({ mc: 1, pl: 1, ul: 0 });
    expect(out[1]).toEqual({ mc: 0, pl: 0, ul: 1 });
  });

  it("adds up multiple days in the same week", () => {
    const out = deriveWeekLeaveTotals(YM, [day("2026-07-06"), day("2026-07-07"), day("2026-07-08", "MC", true)], 5);
    expect(out[1].mc).toBe(2.5);
  });

  it("drops dates from other months instead of misfiling them", () => {
    const out = deriveWeekLeaveTotals(YM, [day("2026-08-03"), day("2026-06-15")], 5);
    expect(sumLeaveTotals(out)).toEqual({ mc: 0, pl: 0, ul: 0 });
  });

  it("respects the work pattern for weekend dates", () => {
    const sat = [day("2026-07-04")];
    expect(sumLeaveTotals(deriveWeekLeaveTotals(YM, sat, 5)).mc).toBe(0);
    expect(sumLeaveTotals(deriveWeekLeaveTotals(YM, sat, 5.5)).mc).toBe(0.5);
    expect(sumLeaveTotals(deriveWeekLeaveTotals(YM, sat, 6)).mc).toBe(1);
  });

  it("never exceeds the days actually in a week — a full week of MC on a 5-day pattern is 5, not 7", () => {
    const wholeWeek = ["06", "07", "08", "09", "10", "11", "12"].map((d) => day(`2026-07-${d}`));
    expect(deriveWeekLeaveTotals(YM, wholeWeek, 5)[1].mc).toBe(5);
    expect(deriveWeekLeaveTotals(YM, wholeWeek, 5.5)[1].mc).toBe(5.5);
    expect(deriveWeekLeaveTotals(YM, wholeWeek, 6)[1].mc).toBe(6);
  });
});

describe("sumLeaveTotals", () => {
  it("adds the weekly totals into a month total", () => {
    const out = deriveWeekLeaveTotals(
      YM,
      [day("2026-07-01", "MC"), day("2026-07-08", "MC"), day("2026-07-15", "PL"), day("2026-07-22", "UL", true)],
      5
    );
    expect(sumLeaveTotals(out)).toEqual({ mc: 2, pl: 1, ul: 0.5 });
  });
});
