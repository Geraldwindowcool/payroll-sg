// Payroll SG — calculation engine.
//
// Ported 1:1 from the original single-file app's business logic (the same
// logic verified there against MOM / CPF Board worked examples). Kept as
// pure functions with no I/O so it's easy to unit test and to call from
// both server components and API routes.

export type CpfBand = { id: string; label: string; maxAge: number };
export type CpfRates = Record<string, Record<string, [number, number]>>; // scheme -> bandId -> [total%, ee%]
export type CpfConfig = {
  owCeiling: number;
  annualCeiling: number;
  minWage: number;
  lowBand: number;
  fullBand: number;
  bands: CpfBand[];
  rates: CpfRates;
};

export type Residency = "SC" | "PR" | "FW";
export type AllowanceBasis = "DAY" | "HOUR" | "FIXED";

export type CompanyConfig = {
  hoursPerWeek: number;
  otMult: number;
  sunOtMult: number;
  sdlEnabled: boolean;
  roundNet: boolean;
  cpf: CpfConfig;
};

export type EmployeeCalc = {
  id: string;
  name: string;
  dob: string; // ISO date, "" if unknown
  res: Residency;
  prDate: string; // ISO date, "" if not PR / not known
  salary: number;
  pattern: number; // 5, 5.5 or 6
  otElig: boolean;
  otMult: number | null; // null = use company default
  sunOtMult: number | null; // null = use company default
  cdacOn: boolean;
  cdacAmt: number;
  levyAmt: number; // resolved monthly levy amount (0 unless res === "FW")
};

export type AllowanceDef = {
  id: string;
  name: string;
  basis: AllowanceBasis;
  rate: number;
  cpfPayable: boolean;
};

export type EmployeeAllowanceLink = { allowanceId: string; rateOverride: number | null };

export type WeekTimesheet = {
  weekIndex: number;
  days: number | null; // manual override; null = auto
  ot: number;
  xot: number;
  sunOt: number; // overtime worked on a Sunday — paid at its own (higher) multiplier
  rdS: number;
  rdF: number;
  ph: number;
  mc: number;
  pl: number;
  ul: number;
  allowanceQty: Record<string, number>;
};

export type MonthlyItemCalc = {
  bonus: number;
  adj: number;
  adjLbl: string;
  reimb: number;
  reimbLbl: string;
  ded: number;
  dedLbl: string;
  note: string;
};

export const EMPTY_WEEK = (weekIndex: number): WeekTimesheet => ({
  weekIndex,
  days: null,
  ot: 0,
  xot: 0,
  sunOt: 0,
  rdS: 0,
  rdF: 0,
  ph: 0,
  mc: 0,
  pl: 0,
  ul: 0,
  allowanceQty: {},
});

export const EMPTY_MONTHLY_ITEM: MonthlyItemCalc = {
  bonus: 0,
  adj: 0,
  adjLbl: "",
  reimb: 0,
  reimbLbl: "",
  ded: 0,
  dedLbl: "",
  note: "",
};

// ---------------------------------------------------------------------
// Calendar / working-day maths
// ---------------------------------------------------------------------

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** pattern 5 -> Mon..Fri = 1. pattern 5.5 -> Mon..Fri = 1, Sat = 0.5. pattern 6 -> Mon..Sat = 1. */
export function dayWeight(date: Date, pattern: number): number {
  const w = date.getDay(); // 0 Sun .. 6 Sat
  if (w === 0) return 0;
  if (w === 6) return pattern >= 6 ? 1 : pattern >= 5.5 ? 0.5 : 0;
  return 1;
}

export function workingDaysInMonth(ym: string, pattern: number): number {
  const [y, m] = ym.split("-").map(Number);
  let total = 0;
  for (let d = 1; d <= daysInMonth(y, m); d++) total += dayWeight(new Date(y, m - 1, d), pattern);
  return total;
}

export type MonthWeek = { i: number; from: number; to: number; label: string; range: string };

/** Weeks of a month: Monday-anchored, clipped to the month. */
export function weeksOfMonth(ym: string): MonthWeek[] {
  const [y, m] = ym.split("-").map(Number);
  const last = daysInMonth(y, m);
  const out: { from: number; to: number }[] = [];
  let cur: { from: number; to: number } | null = null;
  for (let d = 1; d <= last; d++) {
    const dt = new Date(y, m - 1, d);
    const isMon = dt.getDay() === 1;
    if (!cur || isMon) {
      if (cur) out.push(cur);
      cur = { from: d, to: d };
    } else cur.to = d;
  }
  if (cur) out.push(cur);
  return out.map((w, i) => ({
    i,
    from: w.from,
    to: w.to,
    label: "W" + (i + 1),
    range: w.from + "–" + w.to + " " + new Date(y, m - 1, 1).toLocaleString("en-SG", { month: "short" }),
  }));
}

export function workingDaysInWeek(ym: string, wk: { from: number; to: number }, pattern: number): number {
  const [y, m] = ym.split("-").map(Number);
  let t = 0;
  for (let d = wk.from; d <= wk.to; d++) t += dayWeight(new Date(y, m - 1, d), pattern);
  return t;
}

export function ageAt(dob: string, ym: string): number {
  if (!dob) return 30;
  const [y, m] = ym.split("-").map(Number);
  const ref = new Date(y, m - 1, daysInMonth(y, m));
  const b = new Date(dob);
  if (isNaN(b.getTime())) return 30;
  let a = ref.getFullYear() - b.getFullYear();
  const mm = ref.getMonth() - b.getMonth();
  if (mm < 0 || (mm === 0 && ref.getDate() < b.getDate())) a--;
  return clamp(a, 0, 120);
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

// ---------------------------------------------------------------------
// CPF
// ---------------------------------------------------------------------

export function bandFor(cpf: CpfConfig, age: number): string {
  for (const x of cpf.bands) if (age <= x.maxAge) return x.id;
  return cpf.bands[cpf.bands.length - 1].id;
}

export type CpfScheme = "none" | "full" | "pr1" | "pr2";

export function prYear(emp: Pick<EmployeeCalc, "prDate">, ym: string): number {
  if (!emp.prDate) return 3;
  const [y, m] = ym.split("-").map(Number);
  const s = new Date(emp.prDate);
  if (isNaN(s.getTime())) return 3;
  const months = (y - s.getFullYear()) * 12 + (m - 1 - s.getMonth());
  if (months < 0) return 0;
  if (months < 12) return 1;
  if (months < 24) return 2;
  return 3;
}

export function schemeFor(emp: Pick<EmployeeCalc, "res" | "prDate">, ym: string): CpfScheme {
  if (emp.res === "FW") return "none";
  if (emp.res === "PR") {
    const yr = prYear(emp, ym);
    if (yr === 1) return "pr1";
    if (yr === 2) return "pr2";
  }
  return "full";
}

export function ratePair(cpf: CpfConfig, scheme: CpfScheme, bandId: string): { total: number; ee: number } {
  const r = (cpf.rates[scheme] || {})[bandId];
  return r ? { total: +r[0] || 0, ee: +r[1] || 0 } : { total: 0, ee: 0 };
}

export type CpfResult = {
  ee: number;
  er: number;
  total: number;
  ow: number;
  aw: number;
  scheme: CpfScheme;
  awCap: number;
  owCapped: boolean;
  awCapped: boolean;
};

/** ytdOwCpf / ytdAwCpf = CPF-subject OW/AW already accrued this calendar year, before this month. */
export function cpfCalc(
  cpf: CpfConfig,
  emp: Pick<EmployeeCalc, "res" | "prDate" | "dob">,
  ym: string,
  ow: number,
  aw: number,
  ytdOwCpf: number,
  ytdAwCpf: number
): CpfResult {
  const scheme = schemeFor(emp, ym);
  const out: CpfResult = { ee: 0, er: 0, total: 0, ow: 0, aw: 0, scheme, awCap: 0, owCapped: false, awCapped: false };
  if (scheme === "none") return out;

  const age = ageAt(emp.dob, ym);
  const rp = ratePair(cpf, scheme, bandFor(cpf, age));
  if (!rp.total) return out;

  const owCpf = Math.min(ow, cpf.owCeiling);
  out.owCapped = ow > cpf.owCeiling + 0.004;

  const awCap = Math.max(0, cpf.annualCeiling - (ytdOwCpf + owCpf) - ytdAwCpf);
  const awCpf = Math.min(aw, awCap);
  out.awCap = awCap;
  out.awCapped = aw > awCap + 0.004;

  out.ow = owCpf;
  out.aw = awCpf;
  const wages = owCpf + awCpf;
  const tw = ow + aw;
  if (tw <= cpf.minWage || wages <= 0) return out;

  const erRate = (rp.total - rp.ee) / 100;
  const eeRate = rp.ee / 100;
  let rawEr: number, rawEe: number;

  if (tw <= cpf.lowBand) {
    rawEr = erRate * wages;
    rawEe = 0;
  } else if (tw <= cpf.fullBand) {
    const span = cpf.fullBand - cpf.lowBand;
    rawEr = erRate * wages;
    rawEe = ((eeRate * cpf.fullBand) / span) * (tw - cpf.lowBand);
    rawEe = Math.min(rawEe, eeRate * wages);
  } else {
    rawEr = erRate * wages;
    rawEe = eeRate * wages;
  }

  const total = Math.floor(rawEr + rawEe + 0.5);
  const ee = Math.floor(rawEe);
  out.total = total;
  out.ee = ee;
  out.er = Math.max(0, total - ee);
  return out;
}

export function sdlCalc(sdlEnabled: boolean, wages: number): number {
  if (!sdlEnabled) return 0;
  if (wages <= 0) return 0;
  const raw = 0.0025 * wages;
  return Math.round(clamp(raw, 2, 11.25) * 100) / 100;
}

// ---------------------------------------------------------------------
// Wage calculation
// ---------------------------------------------------------------------

function allowRate(al: AllowanceDef, link: EmployeeAllowanceLink | undefined): number {
  const o = link?.rateOverride;
  return o === undefined || o === null ? al.rate : o;
}

export type AllowanceLine = { id: string; name: string; qty: number; rate: number; amt: number; unit: AllowanceBasis; cpf: boolean };

export type WeekResult = {
  wk: MonthWeek;
  stdWeek: number;
  days: number;
  daysManual: boolean;
  hourly: number;
  daily: number;
  mult: number;
  sunMult: number;
  otHrs: number;
  xotHrs: number;
  sunOtHrs: number;
  otPay: number;
  xotPay: number;
  sunOtPay: number;
  rdPay: number;
  phPay: number;
  rdS: number;
  rdF: number;
  phDays: number;
  mc: number;
  pl: number;
  ul: number;
  leaveOver: boolean;
  alLines: AllowanceLine[];
  alCpf: number;
  alNon: number;
  extras: number;
};

export function calcWeek(
  company: CompanyConfig,
  emp: EmployeeCalc,
  ym: string,
  wk: MonthWeek,
  t: WeekTimesheet,
  allowanceDefs: AllowanceDef[],
  empAllowances: EmployeeAllowanceLink[]
): WeekResult {
  const pattern = emp.pattern || 5;
  const salary = emp.salary;
  const stdWeek = workingDaysInWeek(ym, wk, pattern);
  const mc = t.mc || 0,
    pl = t.pl || 0,
    ul = t.ul || 0;

  // MC and paid leave don't touch pay, so they don't reduce days worked. Unpaid
  // leave does — auto-deduct it from the default day count. A manually typed
  // "days worked" always wins.
  const autoDays = Math.max(0, stdWeek - ul);
  const days = t.days === null || t.days === undefined ? autoDays : t.days;
  const daysManual = !(t.days === null || t.days === undefined);
  const leaveOver = mc + pl + ul > stdWeek + 0.001;

  const hourly = company.hoursPerWeek > 0 ? (12 * salary) / (52 * company.hoursPerWeek) : 0;
  const daily = pattern > 0 ? (12 * salary) / (52 * pattern) : 0;
  const mult = emp.otMult || company.otMult || 1.5;
  const sunMult = emp.sunOtMult || company.sunOtMult || 2;

  const otHrs = t.ot || 0,
    xotHrs = t.xot || 0,
    sunOtHrs = t.sunOt || 0;
  const otPay = emp.otElig === false ? 0 : hourly * mult * otHrs;
  const xotPay = emp.otElig === false ? 0 : hourly * mult * xotHrs;
  const sunOtPay = emp.otElig === false ? 0 : hourly * sunMult * sunOtHrs;
  const rdPay = (t.rdS || 0) * 1 * daily + (t.rdF || 0) * 2 * daily;
  const phPay = (t.ph || 0) * daily;

  let alCpf = 0,
    alNon = 0;
  const alLines: AllowanceLine[] = [];
  const empAlSet = new Map(empAllowances.map((a) => [a.allowanceId, a]));
  allowanceDefs
    .filter((a) => empAlSet.has(a.id))
    .forEach((a) => {
      const q = t.allowanceQty[a.id] || 0;
      if (!q) return;
      const rate = allowRate(a, empAlSet.get(a.id));
      const amt = q * rate;
      if (!amt) return;
      alLines.push({ id: a.id, name: a.name, qty: q, rate, amt, unit: a.basis, cpf: a.cpfPayable !== false });
      if (a.cpfPayable !== false) alCpf += amt;
      else alNon += amt;
    });

  return {
    wk,
    stdWeek,
    days,
    daysManual,
    hourly,
    daily,
    mult,
    sunMult,
    otHrs,
    xotHrs,
    sunOtHrs,
    otPay,
    xotPay,
    sunOtPay,
    rdPay,
    phPay,
    rdS: t.rdS || 0,
    rdF: t.rdF || 0,
    phDays: t.ph || 0,
    mc,
    pl,
    ul,
    leaveOver,
    alLines,
    alCpf,
    alNon,
    extras: otPay + xotPay + sunOtPay + rdPay + phPay + alCpf + alNon,
  };
}

export type WagesResult = {
  pattern: number;
  salary: number;
  stdDays: number;
  daysWorked: number;
  incomplete: boolean;
  weeks: WeekResult[];
  basic: number;
  ot: number;
  xot: number;
  sunOt: number;
  rd: number;
  ph: number;
  alCpf: number;
  alNon: number;
  otHrs: number;
  xotHrs: number;
  sunOtHrs: number;
  mc: number;
  pl: number;
  ul: number;
  leaveOver: boolean;
  bonus: number;
  adj: number;
  reimb: number;
  ded: number;
  adjLbl: string;
  reimbLbl: string;
  dedLbl: string;
  note: string;
  ow: number;
  aw: number;
  gross: number;
  hourly: number;
  daily: number;
};

export function calcWages(
  company: CompanyConfig,
  emp: EmployeeCalc,
  ym: string,
  weekTimesheets: WeekTimesheet[], // one entry per week of the month, index-aligned with weeksOfMonth(ym)
  monthlyItem: MonthlyItemCalc,
  allowanceDefs: AllowanceDef[],
  empAllowances: EmployeeAllowanceLink[]
): WagesResult {
  const pattern = emp.pattern || 5;
  const salary = emp.salary;
  const stdDays = workingDaysInMonth(ym, pattern);
  const weeksOm = weeksOfMonth(ym);
  const weeks = weeksOm.map((w, i) => calcWeek(company, emp, ym, w, weekTimesheets[i] ?? EMPTY_WEEK(i), allowanceDefs, empAllowances));

  const daysWorked = weeks.reduce((s, w) => s + w.days, 0);
  const incomplete = daysWorked < stdDays - 0.001;
  const basic = stdDays > 0 ? (incomplete ? (salary * daysWorked) / stdDays : salary) : 0;

  const ot = weeks.reduce((s, w) => s + w.otPay, 0);
  const xot = weeks.reduce((s, w) => s + w.xotPay, 0);
  const sunOt = weeks.reduce((s, w) => s + w.sunOtPay, 0);
  const rd = weeks.reduce((s, w) => s + w.rdPay, 0);
  const ph = weeks.reduce((s, w) => s + w.phPay, 0);
  const alCpf = weeks.reduce((s, w) => s + w.alCpf, 0);
  const alNon = weeks.reduce((s, w) => s + w.alNon, 0);
  const otHrs = weeks.reduce((s, w) => s + w.otHrs, 0);
  const xotHrs = weeks.reduce((s, w) => s + w.xotHrs, 0);
  const sunOtHrs = weeks.reduce((s, w) => s + w.sunOtHrs, 0);
  const mc = weeks.reduce((s, w) => s + w.mc, 0);
  const pl = weeks.reduce((s, w) => s + w.pl, 0);
  const ul = weeks.reduce((s, w) => s + w.ul, 0);
  const leaveOver = weeks.some((w) => w.leaveOver);

  const { bonus, adj, reimb, ded, adjLbl, reimbLbl, dedLbl, note } = monthlyItem;

  const ow = basic + ot + xot + sunOt + rd + ph + alCpf + adj; // Ordinary Wages
  const aw = bonus; // Additional Wages
  const gross = ow + alNon + reimb + aw;

  return {
    pattern,
    salary,
    stdDays,
    daysWorked,
    incomplete,
    weeks,
    basic,
    ot,
    xot,
    sunOt,
    rd,
    ph,
    alCpf,
    alNon,
    otHrs,
    xotHrs,
    sunOtHrs,
    mc,
    pl,
    ul,
    leaveOver,
    bonus,
    adj,
    reimb,
    ded,
    adjLbl,
    reimbLbl,
    dedLbl,
    note,
    ow,
    aw,
    gross,
    hourly: weeks[0]?.hourly ?? 0,
    daily: weeks[0]?.daily ?? 0,
  };
}

export type MonthResult = WagesResult & {
  emp: EmployeeCalc;
  ym: string;
  cpf: CpfResult;
  sdl: number;
  levy: number;
  cdac: number;
  net: number;
  cost: number;
  dedWarn: boolean;
};

/** ytd = CPF-subject OW/AW already accrued this calendar year, before this month. */
export function calcMonth(
  company: CompanyConfig,
  emp: EmployeeCalc,
  ym: string,
  weekTimesheets: WeekTimesheet[],
  monthlyItem: MonthlyItemCalc,
  ytd: { ow: number; aw: number },
  allowanceDefs: AllowanceDef[],
  empAllowances: EmployeeAllowanceLink[]
): MonthResult {
  const w = calcWages(company, emp, ym, weekTimesheets, monthlyItem, allowanceDefs, empAllowances);
  const cpf = cpfCalc(company.cpf, emp, ym, w.ow, w.aw, ytd.ow, ytd.aw);

  const sdlWages = w.ow + w.aw + w.alNon;
  const sdl = sdlCalc(company.sdlEnabled, sdlWages);
  const levy = emp.res === "FW" ? emp.levyAmt : 0;
  const cdac = emp.cdacOn ? emp.cdacAmt || 0 : 0;

  // Round to the nearest cent first — the raw sum above is the tail end of a
  // long chain of floating-point arithmetic, so a net that's genuinely
  // $1876.60 can arrive as something like 1876.599999999998. Flooring that
  // straight to the nearest nickel below would land on 1876.55, a whole
  // nickel short of correct. Snapping to cents first removes that noise
  // before the nickel-rounding (or the final display-rounding) ever sees it.
  let net = Math.round((w.gross - cpf.ee - w.ded - cdac) * 100) / 100;
  if (company.roundNet) {
    const cents = Math.round(net * 100);
    net = (Math.floor(cents / 5) * 5) / 100;
  }

  const cost = w.gross + cpf.er + sdl + levy;
  const otherDed = w.ded + cdac;
  const dedWarn = otherDed > 0 && otherDed > 0.5 * (w.gross - cpf.ee);

  return { ...w, emp, ym, cpf, sdl, levy, cdac, net, cost, dedWarn };
}

// ---------------------------------------------------------------------
// Small formatting helpers (shared between server + client)
// ---------------------------------------------------------------------

export const n2 = (v: number) => (Math.round((v || 0) * 100) / 100).toFixed(2);
export const money = (v: number) => "$" + n2(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const money0 = (v: number) => "$" + Math.round(v || 0).toLocaleString("en-SG");
