import { describe, it, expect } from "vitest";
import {
  cpfCalc,
  sdlCalc,
  calcWages,
  calcWeek,
  calcMonth,
  weeksOfMonth,
  workingDaysInMonth,
  workingDaysInWeek,
  ageAt,
  CompanyConfig,
  CpfConfig,
  EmployeeCalc,
  EMPTY_WEEK,
  EMPTY_MONTHLY_ITEM,
  WeekTimesheet,
} from "./payroll";

const DEFAULT_CPF: CpfConfig = {
  owCeiling: 8000,
  annualCeiling: 102000,
  minWage: 50,
  lowBand: 500,
  fullBand: 750,
  bands: [
    { id: "a55", label: "55 and below", maxAge: 55 },
    { id: "a60", label: "Above 55 to 60", maxAge: 60 },
    { id: "a65", label: "Above 60 to 65", maxAge: 65 },
    { id: "a70", label: "Above 65 to 70", maxAge: 70 },
    { id: "a99", label: "Above 70", maxAge: 999 },
  ],
  rates: {
    full: { a55: [37, 20], a60: [34, 18], a65: [25, 12.5], a70: [16.5, 7.5], a99: [12.5, 5] },
    pr1: { a55: [9, 5], a60: [9, 5], a65: [8.5, 5], a70: [8.5, 5], a99: [8.5, 5] },
    pr2: { a55: [24, 15], a60: [21, 12.5], a65: [17, 7.5], a70: [13, 5], a99: [11.5, 5] },
  },
};

const company = (over: Partial<CompanyConfig> = {}): CompanyConfig => ({
  hoursPerWeek: 44,
  otMult: 1.5,
  sdlEnabled: true,
  roundNet: false,
  cpf: DEFAULT_CPF,
  ...over,
});

const emp = (over: Partial<EmployeeCalc> = {}): EmployeeCalc => ({
  id: "e1",
  name: "X",
  dob: "1990-01-01",
  res: "SC",
  prDate: "",
  salary: 0,
  pattern: 5,
  otElig: true,
  otMult: null,
  cdacOn: false,
  cdacAmt: 0,
  levyAmt: 0,
  ...over,
});

const weeksFor = (ym: string, overrides: Record<number, Partial<WeekTimesheet>> = {}): WeekTimesheet[] =>
  weeksOfMonth(ym).map((w) => ({ ...EMPTY_WEEK(w.i), ...(overrides[w.i] || {}) }));

const tol = (a: number, b: number, t = 0.005) => expect(Math.abs(a - b)).toBeLessThanOrEqual(t);

describe("CPF", () => {
  it("full rates, age 30, OW 4000", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ dob: "1996-01-01" }), "2026-08", 4000, 0, 0, 0);
    tol(c.total, 1480);
    tol(c.ee, 800);
    tol(c.er, 680);
  });

  it("OW ceiling bites at 8000", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ dob: "1996-01-01" }), "2026-08", 9000, 0, 0, 0);
    tol(c.total, 2960);
    tol(c.ee, 1600);
    expect(c.owCapped).toBe(true);
  });

  it("age band >55-60 => 34% / 18%", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ dob: "1968-01-01" }), "2026-08", 3000, 0, 0, 0);
    tol(c.total, 1020);
  });

  it("PR year 1 graduated rate", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ res: "PR", dob: "1996-01-01", prDate: "2026-06-01" }), "2026-08", 3000, 0, 0, 0);
    // 2 months in -> year 1 -> 9% total, 5% ee
    tol(c.total, 270);
    tol(c.ee, 150);
    expect(c.scheme).toBe("pr1");
  });

  it("PR year 2 graduated rate", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ res: "PR", dob: "1996-01-01", prDate: "2025-06-01" }), "2026-08", 3000, 0, 0, 0);
    expect(c.scheme).toBe("pr2");
    tol(c.total, 720);
  });

  it("PR 3rd year onward uses full rates", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ res: "PR", dob: "1996-01-01", prDate: "2020-01-01" }), "2026-08", 3000, 0, 0, 0);
    expect(c.scheme).toBe("full");
  });

  it("Work Permit / S Pass: no CPF", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ res: "FW" }), "2026-08", 3000, 0, 0, 0);
    expect(c.total).toBe(0);
    expect(c.scheme).toBe("none");
  });

  it("low-wage phase-in: below $500 total wages -> no employee share", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ dob: "1996-01-01" }), "2026-08", 400, 0, 0, 0);
    expect(c.ee).toBe(0);
    expect(c.er).toBeGreaterThan(0);
  });

  it("below minWage ($50): no CPF at all", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ dob: "1996-01-01" }), "2026-08", 40, 0, 0, 0);
    expect(c.total).toBe(0);
  });

  it("Additional Wage ceiling applies progressively", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ dob: "1996-01-01" }), "2026-08", 6000, 100000, 0, 0);
    tol(c.awCap, 102000 - 6000, 1);
    expect(c.awCapped).toBe(true);
  });

  it("CPF rounding: total rounds to nearest dollar, ee truncates", () => {
    const c = cpfCalc(DEFAULT_CPF, emp({ dob: "1996-01-01" }), "2026-08", 4001, 0, 0, 0);
    expect(Number.isInteger(c.total)).toBe(true);
    expect(Number.isInteger(c.ee)).toBe(true);
  });
});

describe("SDL", () => {
  it("0.25% of wages, min $2", () => {
    tol(sdlCalc(true, 100), 2);
  });
  it("caps at $11.25", () => {
    tol(sdlCalc(true, 10000), 11.25);
  });
  it("off when disabled", () => {
    expect(sdlCalc(false, 5000)).toBe(0);
  });
});

describe("Overtime + working days", () => {
  it("hourly basic rate formula", () => {
    const co = company();
    const e = emp({ salary: 4400 });
    const hourly = (12 * e.salary) / (52 * co.hoursPerWeek);
    tol(hourly, 23.0769, 0.01);
  });

  it("OT pay = hourly * mult * hours", () => {
    const co = company();
    const e = emp({ salary: 4400, pattern: 5 });
    const weeks = weeksFor("2026-08", { 0: { ot: 10 } });
    const wages = calcWages(co, e, "2026-08", weeks, EMPTY_MONTHLY_ITEM, [], []);
    const hourly = (12 * 4400) / (52 * 44);
    tol(wages.ot, hourly * 1.5 * 10, 0.01);
  });

  it("6-day week counts Saturday as a full day", () => {
    const days = workingDaysInWeek("2026-08", { from: 3, to: 9 }, 6); // Mon 3 - Sun 9
    tol(days, 6);
  });

  it("5-day week excludes Saturday", () => {
    const days = workingDaysInWeek("2026-08", { from: 3, to: 9 }, 5);
    tol(days, 5);
  });

  it("5.5-day week counts Saturday as half", () => {
    const days = workingDaysInWeek("2026-08", { from: 3, to: 9 }, 5.5);
    tol(days, 5.5);
  });
});

describe("Incomplete month pro-ration", () => {
  it("salary * daysWorked / stdDays", () => {
    const co = company();
    const e = emp({ salary: 3000, pattern: 5 });
    const weeks = weeksFor("2026-08");
    const stdDays = workingDaysInMonth("2026-08", 5);
    // zero out all weeks except the first (simulate joining mid-month)
    const trimmed = weeks.map((w, i) => (i === 0 ? w : { ...w, days: 0 }));
    const wages = calcWages(co, e, "2026-08", trimmed, EMPTY_MONTHLY_ITEM, [], []);
    tol(wages.basic, (3000 * wages.daysWorked) / stdDays, 0.01);
    expect(wages.incomplete).toBe(true);
  });
});

describe("Rest day and public holiday pay", () => {
  it("rest day half day or less = 1x daily; more than half = 2x daily; PH = 1x daily", () => {
    const co = company();
    const e = emp({ salary: 3120, pattern: 6 });
    const weeks = weeksFor("2026-08", { 0: { rdF: 1, rdS: 1, ph: 1 } });
    const wages = calcWages(co, e, "2026-08", weeks, EMPTY_MONTHLY_ITEM, [], []);
    const daily = (12 * 3120) / (52 * 6);
    tol(daily, 120, 0.01);
    tol(wages.rd, 3 * daily, 0.01);
    tol(wages.ph, daily, 0.01);
  });
});

describe("Leave (MC / paid leave / unpaid leave)", () => {
  it("unpaid leave reduces days worked and so basic pay", () => {
    const co = company();
    const e = emp({ salary: 3000, pattern: 5 });
    // week 1 (index 1) is the first full Mon-Fri week of August 2026 — week 0
    // is just the Sat/Sun stub before the first Monday, which has zero
    // working days under a 5-day pattern, so leave placed there is a no-op.
    const weeks = weeksFor("2026-08", { 1: { ul: 2 } });
    const wages = calcWages(co, e, "2026-08", weeks, EMPTY_MONTHLY_ITEM, [], []);
    expect(wages.ul).toBe(2);
    expect(wages.incomplete).toBe(true);
  });

  it("MC and paid leave do not reduce days worked or pay", () => {
    const co = company();
    const e = emp({ salary: 3000, pattern: 5 });
    const weeks = weeksFor("2026-08", { 1: { mc: 2, pl: 1 } });
    const wages = calcWages(co, e, "2026-08", weeks, EMPTY_MONTHLY_ITEM, [], []);
    const stdDays = workingDaysInMonth("2026-08", 5);
    tol(wages.basic, 3000, 0.01);
    expect(wages.incomplete).toBe(false);
    tol(wages.daysWorked, stdDays, 0.01);
    expect(wages.mc).toBe(2);
    expect(wages.pl).toBe(1);
  });

  it("leaveOver flags when MC+leave+unpaid exceed a standard week", () => {
    const co = company();
    const e = emp({ salary: 3000, pattern: 5 });
    const weeks = weeksFor("2026-08", { 1: { mc: 4, pl: 2 } }); // 6 > 5-day standard week
    const wages = calcWages(co, e, "2026-08", weeks, EMPTY_MONTHLY_ITEM, [], []);
    expect(wages.leaveOver).toBe(true);
  });
});

describe("Foreign worker levy", () => {
  it("levy flows into cost, not a deduction", () => {
    const co = company();
    const e = emp({ res: "FW", salary: 1400, pattern: 6, levyAmt: 700 });
    const weeks = weeksFor("2026-08");
    const m = calcMonth(co, e, "2026-08", weeks, EMPTY_MONTHLY_ITEM, { ow: 0, aw: 0 }, [], []);
    expect(m.cpf.ee).toBe(0);
    tol(m.net, m.gross, 0.01);
    tol(m.cost, m.gross + m.sdl + 700, 0.01);
  });
});

describe("CDAC / community fund", () => {
  it("deducts the configured monthly amount from net pay", () => {
    const co = company();
    const e = emp({ salary: 3000, pattern: 5, cdacOn: true, cdacAmt: 2 });
    const weeks = weeksFor("2026-08");
    const m = calcMonth(co, e, "2026-08", weeks, EMPTY_MONTHLY_ITEM, { ow: 0, aw: 0 }, [], []);
    expect(m.cdac).toBe(2);
    tol(m.net, m.gross - m.cpf.ee - m.ded - 2, 0.01);
  });

  it("off by default", () => {
    const co = company();
    const e = emp({ salary: 3000, pattern: 5 });
    const weeks = weeksFor("2026-08");
    const m = calcMonth(co, e, "2026-08", weeks, EMPTY_MONTHLY_ITEM, { ow: 0, aw: 0 }, [], []);
    expect(m.cdac).toBe(0);
  });
});

describe("Calendar totals", () => {
  it("weeks cover every day of the month", () => {
    const sum = weeksOfMonth("2026-08").reduce((s, w) => s + (w.to - w.from + 1), 0);
    expect(sum).toBe(31);
  });
  it("Feb 2026 (non-leap) has 28 days", () => {
    const sum = weeksOfMonth("2026-02").reduce((s, w) => s + (w.to - w.from + 1), 0);
    expect(sum).toBe(28);
  });
  it("per-week working days sum to the month total", () => {
    const perWeek = weeksOfMonth("2026-08").reduce((s, w) => s + workingDaysInWeek("2026-08", w, 5), 0);
    tol(perWeek, workingDaysInMonth("2026-08", 5));
  });
});

describe("Age at reference month", () => {
  it("computes age as of the end of the given month", () => {
    // Reference date is the LAST day of ym, so a birthday anywhere within
    // that same month has already "happened" by the reference date.
    tol(ageAt("1996-08-15", "2026-08"), 30);
    tol(ageAt("1996-08-31", "2026-08"), 30);
    // A birthday in the following month hasn't occurred yet as of this
    // month's end, so they're still one year younger.
    tol(ageAt("1996-09-01", "2026-08"), 29);
  });
});
