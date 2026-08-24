// Payroll SG — database schema (Drizzle ORM, Postgres).
// Runs anywhere Postgres runs — Neon (recommended, via Vercel's Storage
// tab), Supabase, or a plain Postgres instance.

import { createId } from "@paralleldrive/cuid2";
import {
  pgTable,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => createId());
// Foreign-key column helper — takes the actual snake_case column name so it
// never collides with the "id" primary key column on the same table.
const fk = (column: string) => text(column).notNull();

export const roleEnum = pgEnum("role", ["ADMIN", "STAFF"]);
export const residencyEnum = pgEnum("residency", ["SC", "PR", "FW"]);
export const allowanceBasisEnum = pgEnum("allowance_basis", ["DAY", "HOUR", "FIXED"]);

// Default CPF configuration — January 2026 figures. Editable per company
// from Settings once the app is running; this is only the seed value.
export const DEFAULT_CPF = {
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
} as const;

export const DEFAULT_BANK_COLS = [
  { on: true, head: "Payee Name", f: "name" },
  { on: true, head: "Bank Code", f: "bankCode" },
  { on: true, head: "Branch Code", f: "branchCode" },
  { on: true, head: "Account Number", f: "acct" },
  { on: true, head: "Amount", f: "amount" },
  { on: true, head: "Currency", f: "ccy" },
  { on: true, head: "Payment Date", f: "payDate" },
  { on: true, head: "Payment Type", f: "payType" },
  { on: true, head: "Reference", f: "ref" },
] as const;

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("STAFF"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const companies = pgTable("companies", {
  id: id(),
  name: text("name").notNull(),
  uen: text("uen").notNull().default(""),
  acct: text("acct").notNull().default(""),
  bank: text("bank").notNull().default(""),
  ref: text("ref").notNull().default("SALARY"),
  hoursPerWeek: numeric("hours_per_week", { mode: "number", precision: 6, scale: 2 }).notNull().default(44),
  otMult: numeric("ot_mult", { mode: "number", precision: 4, scale: 2 }).notNull().default(1.5),
  sdlEnabled: boolean("sdl_enabled").notNull().default(true),
  roundNet: boolean("round_net").notNull().default(false),
  cpf: jsonb("cpf").notNull().$type<typeof DEFAULT_CPF>().default(DEFAULT_CPF as any),
  bankCols: jsonb("bank_cols").notNull().$type<typeof DEFAULT_BANK_COLS>().default(DEFAULT_BANK_COLS as any),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const levies = pgTable(
  "levies",
  {
    id: id(),
    companyId: fk("company_id"),
    label: text("label").notNull(),
    amt: numeric("amt", { mode: "number", precision: 10, scale: 2 }).notNull(),
  },
  (t) => [index("levies_company_idx").on(t.companyId)]
);

export const allowances = pgTable(
  "allowances",
  {
    id: id(),
    companyId: fk("company_id"),
    name: text("name").notNull(),
    basis: allowanceBasisEnum("basis").notNull().default("DAY"),
    rate: numeric("rate", { mode: "number", precision: 10, scale: 2 }).notNull().default(0),
    cpfPayable: boolean("cpf_payable").notNull().default(true),
  },
  (t) => [index("allowances_company_idx").on(t.companyId)]
);

export const employees = pgTable(
  "employees",
  {
    id: id(),
    companyId: fk("company_id"),
    name: text("name").notNull(),
    empNo: text("emp_no").notNull().default(""),
    nric: text("nric").notNull().default(""), // NRIC (citizens/PRs) or FIN (work pass holders)
    dob: text("dob").notNull().default(""), // ISO date string
    res: residencyEnum("res").notNull().default("FW"),
    prDate: text("pr_date").notNull().default(""),
    salary: numeric("salary", { mode: "number", precision: 10, scale: 2 }).notNull().default(0),
    pattern: numeric("pattern", { mode: "number", precision: 3, scale: 1 }).notNull().default(5),
    otElig: boolean("ot_elig").notNull().default(true),
    otMult: numeric("ot_mult", { mode: "number", precision: 4, scale: 2 }),
    levyId: text("levy_id"),
    bankName: text("bank_name").notNull().default(""),
    bankCode: text("bank_code").notNull().default(""),
    branchCode: text("branch_code").notNull().default(""),
    acct: text("acct").notNull().default(""),
    email: text("email").notNull().default(""),
    active: boolean("active").notNull().default(true),
    cdacOn: boolean("cdac_on").notNull().default(false),
    cdacAmt: numeric("cdac_amt", { mode: "number", precision: 10, scale: 2 }),
    // Leave entitlement — a common feature in off-the-shelf HR/payroll apps
    // (Talenox, Swingvy, HReasily etc. all track balances against an
    // entitlement). Days per calendar year; editable per employee.
    alEntitlement: numeric("al_entitlement", { mode: "number", precision: 5, scale: 1 }).notNull().default(14),
    mcEntitlement: numeric("mc_entitlement", { mode: "number", precision: 5, scale: 1 }).notNull().default(14),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("employees_company_idx").on(t.companyId)]
);

export const employeeAllowances = pgTable(
  "employee_allowances",
  {
    id: id(),
    employeeId: fk("employee_id"),
    allowanceId: fk("allowance_id"),
    rateOverride: numeric("rate_override", { mode: "number", precision: 10, scale: 2 }),
  },
  (t) => [uniqueIndex("emp_allow_unique").on(t.employeeId, t.allowanceId)]
);

// One row per employee, per month, per week-of-month (0-5). Staff logins
// are restricted (at the application layer, in src/lib/access.ts) to
// writing only the mc / pl / ul columns on this table.
export const timesheetWeeks = pgTable(
  "timesheet_weeks",
  {
    id: id(),
    companyId: fk("company_id"),
    employeeId: fk("employee_id"),
    ym: text("ym").notNull(), // "YYYY-MM"
    weekIndex: integer("week_index").notNull(),
    days: numeric("days", { mode: "number", precision: 4, scale: 2 }), // manual override; null = auto
    ot: numeric("ot", { mode: "number", precision: 6, scale: 2 }).notNull().default(0),
    xot: numeric("xot", { mode: "number", precision: 6, scale: 2 }).notNull().default(0),
    rdS: numeric("rd_s", { mode: "number", precision: 4, scale: 2 }).notNull().default(0),
    rdF: numeric("rd_f", { mode: "number", precision: 4, scale: 2 }).notNull().default(0),
    ph: numeric("ph", { mode: "number", precision: 4, scale: 2 }).notNull().default(0),
    mc: numeric("mc", { mode: "number", precision: 4, scale: 2 }).notNull().default(0),
    pl: numeric("pl", { mode: "number", precision: 4, scale: 2 }).notNull().default(0),
    ul: numeric("ul", { mode: "number", precision: 4, scale: 2 }).notNull().default(0),
    allowanceQty: jsonb("allowance_qty").notNull().$type<Record<string, number>>().default({}),
    updatedByUserId: text("updated_by_user_id"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ts_week_unique").on(t.employeeId, t.ym, t.weekIndex),
    index("ts_week_company_ym_idx").on(t.companyId, t.ym),
  ]
);

export const monthlyItems = pgTable(
  "monthly_items",
  {
    id: id(),
    companyId: fk("company_id"),
    employeeId: fk("employee_id"),
    ym: text("ym").notNull(),
    bonus: numeric("bonus", { mode: "number", precision: 10, scale: 2 }).notNull().default(0),
    adj: numeric("adj", { mode: "number", precision: 10, scale: 2 }).notNull().default(0),
    adjLbl: text("adj_lbl").notNull().default(""),
    reimb: numeric("reimb", { mode: "number", precision: 10, scale: 2 }).notNull().default(0),
    reimbLbl: text("reimb_lbl").notNull().default(""),
    ded: numeric("ded", { mode: "number", precision: 10, scale: 2 }).notNull().default(0),
    dedLbl: text("ded_lbl").notNull().default(""),
    note: text("note").notNull().default(""),
    paid: boolean("paid").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mo_item_unique").on(t.employeeId, t.ym),
    index("mo_item_company_ym_idx").on(t.companyId, t.ym),
  ]
);

// ---- relations (used by db.query.* for convenient nested fetches) ----

export const companiesRelations = relations(companies, ({ many }) => ({
  employees: many(employees),
  allowances: many(allowances),
  levies: many(levies),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  company: one(companies, { fields: [employees.companyId], references: [companies.id] }),
  levy: one(levies, { fields: [employees.levyId], references: [levies.id] }),
  allowanceLinks: many(employeeAllowances),
  timesheets: many(timesheetWeeks),
  monthlyItems: many(monthlyItems),
}));

export const allowancesRelations = relations(allowances, ({ one, many }) => ({
  company: one(companies, { fields: [allowances.companyId], references: [companies.id] }),
  employeeLinks: many(employeeAllowances),
}));

export const employeeAllowancesRelations = relations(employeeAllowances, ({ one }) => ({
  employee: one(employees, { fields: [employeeAllowances.employeeId], references: [employees.id] }),
  allowance: one(allowances, { fields: [employeeAllowances.allowanceId], references: [allowances.id] }),
}));

export const leviesRelations = relations(levies, ({ one, many }) => ({
  company: one(companies, { fields: [levies.companyId], references: [companies.id] }),
  employees: many(employees),
}));

export const timesheetWeeksRelations = relations(timesheetWeeks, ({ one }) => ({
  employee: one(employees, { fields: [timesheetWeeks.employeeId], references: [employees.id] }),
  company: one(companies, { fields: [timesheetWeeks.companyId], references: [companies.id] }),
  updatedByUser: one(users, { fields: [timesheetWeeks.updatedByUserId], references: [users.id] }),
}));

export const monthlyItemsRelations = relations(monthlyItems, ({ one }) => ({
  employee: one(employees, { fields: [monthlyItems.employeeId], references: [employees.id] }),
  company: one(companies, { fields: [monthlyItems.companyId], references: [companies.id] }),
}));

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Levy = typeof levies.$inferSelect;
export type Allowance = typeof allowances.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type EmployeeAllowance = typeof employeeAllowances.$inferSelect;
export type TimesheetWeek = typeof timesheetWeeks.$inferSelect;
export type MonthlyItem = typeof monthlyItems.$inferSelect;
