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
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => createId());
// Foreign-key column helper — takes the actual snake_case column name so it
// never collides with the "id" primary key column on the same table.
const fk = (column: string) => text(column).notNull();

// Drizzle has no built-in Postgres bytea column, so this defines one:
// raw file bytes in, a Node Buffer out — used for MC attachment files.
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const roleEnum = pgEnum("role", ["ADMIN", "STAFF"]);
export const residencyEnum = pgEnum("residency", ["SC", "PR", "FW"]);
export const allowanceBasisEnum = pgEnum("allowance_basis", ["DAY", "HOUR", "FIXED"]);
export const leaveTypeEnum = pgEnum("leave_type", ["MC", "PL", "UL"]);
export const budgetCategoryTypeEnum = pgEnum("budget_category_type", ["INCOME", "EXPENSE"]);
export const budgetEntrySourceEnum = pgEnum("budget_entry_source", ["MANUAL", "XERO"]);
export const payrollCashAdjustmentReasonEnum = pgEnum("payroll_cash_adjustment_reason", ["DEFERRED_DRAW", "UNPAID_LEAVE_CPF", "COST_SHARE", "OTHER"]);

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

export interface BankCol {
  on: boolean;
  head: string;
  f: string;
}

export const DEFAULT_BANK_COLS: BankCol[] = [
  { on: true, head: "Payee Name", f: "name" },
  { on: true, head: "Bank Code", f: "bankCode" },
  { on: true, head: "Branch Code", f: "branchCode" },
  { on: true, head: "Account Number", f: "acct" },
  { on: true, head: "Amount", f: "amount" },
  { on: true, head: "Currency", f: "ccy" },
  { on: true, head: "Payment Date", f: "payDate" },
  { on: true, head: "Purpose Code", f: "payType" },
  { on: true, head: "Reference", f: "ref" },
];

/** Every field the bank file export knows how to fill in, with a sensible
 *  default header — the full menu Settings' "Bank file columns" editor
 *  offers, independent of which ones a given company currently has
 *  switched on. Adding a field here only makes it available to enable;
 *  the export route (src/app/admin/bank/export/route.ts) is what
 *  actually needs to know how to compute its value. */
export const BANK_FIELD_OPTIONS = [
  { f: "name", defaultHead: "Payee Name" },
  { f: "bankName", defaultHead: "Employee Bank" },
  { f: "bankCode", defaultHead: "Bank Code" },
  { f: "branchCode", defaultHead: "Branch Code" },
  { f: "acct", defaultHead: "Account Number" },
  { f: "amount", defaultHead: "Amount" },
  { f: "ccy", defaultHead: "Currency" },
  { f: "payDate", defaultHead: "Payment Date" },
  { f: "payType", defaultHead: "Purpose Code" },
  { f: "ref", defaultHead: "Reference" },
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
  sunOtMult: numeric("sun_ot_mult", { mode: "number", precision: 4, scale: 2 }).notNull().default(2),
  sdlEnabled: boolean("sdl_enabled").notNull().default(true),
  roundNet: boolean("round_net").notNull().default(false),
  cpf: jsonb("cpf").notNull().$type<typeof DEFAULT_CPF>().default(DEFAULT_CPF as any),
  bankCols: jsonb("bank_cols").notNull().$type<BankCol[]>().default(DEFAULT_BANK_COLS as any),
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
    title: text("title").notNull().default(""), // job title / role
    joinDate: text("join_date").notNull().default(""), // ISO date string
    res: residencyEnum("res").notNull().default("FW"),
    prDate: text("pr_date").notNull().default(""),
    salary: numeric("salary", { mode: "number", precision: 10, scale: 2 }).notNull().default(0),
    pattern: numeric("pattern", { mode: "number", precision: 3, scale: 1 }).notNull().default(5),
    otElig: boolean("ot_elig").notNull().default(true),
    otMult: numeric("ot_mult", { mode: "number", precision: 4, scale: 2 }),
    sunOtMult: numeric("sun_ot_mult", { mode: "number", precision: 4, scale: 2 }),
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
    // Free-text history/context (salary-change notes, resignation dates,
    // account numbers, anything worth keeping that doesn't fit a field of
    // its own) — carried over from whatever paper trail an employer already
    // keeps, so migrating into this app doesn't mean losing that context.
    notes: text("notes").notNull().default(""),
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

// Individual dates an employee was on MC / paid leave / unpaid leave.
// The payroll engine still works off the per-week day COUNTS stored on
// timesheet_weeks (mc/pl/ul) — these rows are the detail behind those
// counts, so you can see *which* days someone was out, not just how many.
// Saving the calendar recomputes the affected week totals from these rows
// (see deriveWeekLeaveTotals), which is why a Saturday counts 0.5 on a
// 5.5-day pattern and 0 on a 5-day one, exactly as the engine expects.
export const leaveDays = pgTable(
  "leave_days",
  {
    id: id(),
    companyId: fk("company_id"),
    employeeId: fk("employee_id"),
    date: text("date").notNull(), // ISO "YYYY-MM-DD"
    type: leaveTypeEnum("type").notNull(),
    half: boolean("half").notNull().default(false),
    updatedByUserId: text("updated_by_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // One leave entry per employee per date — a day is MC or leave, not both.
    uniqueIndex("leave_day_unique").on(t.employeeId, t.date),
    index("leave_day_company_date_idx").on(t.companyId, t.date),
  ]
);

// A photo or PDF of an employee's actual MC slip, kept alongside the
// dates marked on the leave calendar for that month — the calendar marks
// WHEN someone was out; this is the paperwork proving why. Scoped to a
// month rather than a specific date range: simpler to attach ("the MC for
// August"), and a month can hold more than one file if there were
// multiple MC episodes. Stored directly in Postgres rather than a
// separate object-storage service — this app has none set up, and MC
// photos are small and infrequent enough that a bytea column is the
// simplest thing that works, not a scale compromise.
export const mcAttachments = pgTable(
  "mc_attachments",
  {
    id: id(),
    companyId: fk("company_id"),
    employeeId: fk("employee_id"),
    ym: text("ym").notNull(), // "YYYY-MM"
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    fileData: bytea("file_data").notNull(),
    uploadedByUserId: text("uploaded_by_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("mc_attachments_employee_ym_idx").on(t.employeeId, t.ym)]
);

// Which employees a STAFF login is allowed to see/edit on the attendance
// and MC/leave screens. A Staff user with NO rows here is unrestricted
// (sees everyone) — this keeps every existing login working exactly as
// before; scoping only kicks in once an admin deliberately assigns a
// specific list to that login from Settings.
export const employeeAccess = pgTable(
  "employee_access",
  {
    id: id(),
    userId: fk("user_id"),
    employeeId: fk("employee_id"),
  },
  (t) => [uniqueIndex("user_employee_access_unique").on(t.userId, t.employeeId), index("employee_access_user_idx").on(t.userId)]
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
    sunOt: numeric("sun_ot", { mode: "number", precision: 6, scale: 2 }).notNull().default(0),
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

// A whole-business budget, tracked per company like everything else here.
// Categories are the "lines" of a budget (Rent, Marketing, Payroll, ...);
// entries are the actual dated amounts logged against a category+month.
// The "Payroll" category is special: isSystem=true, never has entries of
// its own — its actual figure is always computed live from
// getMonthPayroll(), so it can never drift out of sync with real payroll.
export const budgetCategories = pgTable(
  "budget_categories",
  {
    id: id(),
    companyId: fk("company_id"),
    name: text("name").notNull(),
    type: budgetCategoryTypeEnum("type").notNull(),
    monthlyTarget: numeric("monthly_target", { mode: "number", precision: 10, scale: 2 }),
    isSystem: boolean("is_system").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("budget_categories_company_idx").on(t.companyId)]
);

export const budgetEntries = pgTable(
  "budget_entries",
  {
    id: id(),
    companyId: fk("company_id"),
    categoryId: fk("category_id"),
    ym: text("ym").notNull(), // "YYYY-MM"
    amount: numeric("amount", { mode: "number", precision: 10, scale: 2 }).notNull(),
    description: text("description").notNull().default(""),
    // MANUAL (default) for anything typed in by hand; XERO for the one
    // entry per category+month that "Refresh from Xero" maintains — that
    // button re-writes its own entry each time rather than piling up
    // duplicates, while manual entries next to it are left alone.
    source: budgetEntrySourceEnum("source").notNull().default("MANUAL"),
    updatedByUserId: text("updated_by_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("budget_entries_company_ym_idx").on(t.companyId, t.ym), index("budget_entries_category_idx").on(t.categoryId)]
);

// One row per company holding its live connection to a Xero organisation —
// the tokens needed to call the Xero API on that company's behalf, set up
// once via the /api/xero/authorize -> /api/xero/callback handshake and kept
// fresh automatically (refreshToken rotates every time it's used).
export const xeroConnections = pgTable(
  "xero_connections",
  {
    id: id(),
    companyId: fk("company_id"),
    tenantId: text("tenant_id").notNull(),
    tenantName: text("tenant_name").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("xero_connections_company_unique").on(t.companyId)]
);

// Reconciles this month's real, accrued payroll cost (the figure CPF is
// actually filed on — never touched by this table) against what was
// really paid out in cash, for real, disclosed reasons: a deferred
// owner's draw, an employee on unpaid leave, or a cost-share/secondment
// arrangement with another company. Every row needs a note — this is a
// transparent reconciliation ledger, not a way to make numbers disappear.
// Purely a Budget-side reporting overlay; it never feeds back into
// payroll calculations, CPF filings, payslips, or the bank file.
export const payrollCashAdjustments = pgTable(
  "payroll_cash_adjustments",
  {
    id: id(),
    companyId: fk("company_id"),
    employeeId: text("employee_id"),
    ym: text("ym").notNull(), // "YYYY-MM"
    reason: payrollCashAdjustmentReasonEnum("reason").notNull(),
    amount: numeric("amount", { mode: "number", precision: 10, scale: 2 }).notNull(),
    note: text("note").notNull(),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("payroll_cash_adjustments_company_ym_idx").on(t.companyId, t.ym)]
);

export const payrollCashAdjustmentsRelations = relations(payrollCashAdjustments, ({ one }) => ({
  company: one(companies, { fields: [payrollCashAdjustments.companyId], references: [companies.id] }),
  employee: one(employees, { fields: [payrollCashAdjustments.employeeId], references: [employees.id] }),
}));

export const budgetCategoriesRelations = relations(budgetCategories, ({ one, many }) => ({
  company: one(companies, { fields: [budgetCategories.companyId], references: [companies.id] }),
  entries: many(budgetEntries),
}));

export const budgetEntriesRelations = relations(budgetEntries, ({ one }) => ({
  company: one(companies, { fields: [budgetEntries.companyId], references: [companies.id] }),
  category: one(budgetCategories, { fields: [budgetEntries.categoryId], references: [budgetCategories.id] }),
}));

export const xeroConnectionsRelations = relations(xeroConnections, ({ one }) => ({
  company: one(companies, { fields: [xeroConnections.companyId], references: [companies.id] }),
}));

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Levy = typeof levies.$inferSelect;
export type Allowance = typeof allowances.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type EmployeeAllowance = typeof employeeAllowances.$inferSelect;
export type TimesheetWeek = typeof timesheetWeeks.$inferSelect;
export type MonthlyItem = typeof monthlyItems.$inferSelect;
export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type BudgetEntry = typeof budgetEntries.$inferSelect;
export type XeroConnection = typeof xeroConnections.$inferSelect;
export type PayrollCashAdjustment = typeof payrollCashAdjustments.$inferSelect;
export type McAttachment = typeof mcAttachments.$inferSelect;
export type McAttachmentMeta = Omit<McAttachment, "fileData">;
