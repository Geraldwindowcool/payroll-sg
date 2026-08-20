import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  console.log((cond ? "✓ " : "✗ ") + name + (detail ? " — " + detail : ""));
}

const b = await chromium.launch();
const p = await b.newPage();
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

// ---- login as admin ----
await p.goto(`${BASE}/login`);
await p.fill('input[name="email"]', "admin@example.com");
await p.fill('input[name="password"]', "change-me-please");
await p.click('button[type="submit"]');
await p.waitForURL(/\/(admin|leave)/, { timeout: 10000 });
check("admin login redirects", /\/admin/.test(p.url()), p.url());

// ---- overview ----
await p.goto(`${BASE}/admin`);
check("overview loads", (await p.title()).length > 0);

// ---- employees: add one ----
await p.goto(`${BASE}/admin/employees`);
await p.click("text=+ Add an employee");
await p.fill('input[name="name"]', "Test Worker");
await p.fill('input[name="empNo"]', "T001");
await p.fill('input[name="salary"]', "3000");
await p.selectOption('select[name="res"]', "SC");
await p.click('button:has-text("Add employee")');
await p.waitForURL(/\/admin\/employees\//, { timeout: 10000 });
const empUrl = p.url();
check("employee created & redirected to detail page", /\/admin\/employees\//.test(empUrl), empUrl);
const empId = empUrl.split("/").pop();

// ---- allowances: add one ----
await p.goto(`${BASE}/admin/allowances`);
await p.fill('form:has(button:has-text("Add")) input[name="name"]', "Test Allowance");
await p.fill('form:has(button:has-text("Add")) input[name="rate"]', "10");
await p.click('form:has(button:has-text("Add")) >> button:has-text("Add")');
await p.waitForLoadState("networkidle");
const allowNames = await p.locator('input[name="name"]').evaluateAll((els) => els.map((e) => e.value));
check("allowance created", allowNames.includes("Test Allowance"), allowNames.join(", "));

// ---- assign allowance to test employee ----
await p.goto(`${BASE}/admin/employees/${empId}`);
const cb = p.locator('input[type="checkbox"][name="allowanceIds"]').first();
await cb.check();
await p.click('button:has-text("Save allowances")');
await p.waitForLoadState("networkidle");
await p.goto(`${BASE}/admin/employees/${empId}`);
check("allowance assignment persisted", await p.locator('input[type="checkbox"][name="allowanceIds"]').first().isChecked());

// ---- timesheet: enter hours for the test employee ----
await p.goto(`${BASE}/admin/timesheet?ym=2026-08&w=1`);
await p.fill(`input[name="ot_${empId}"]`, "5");
await p.fill(`input[name="mc_${empId}"]`, "1");
await p.click('button:has-text("Save W2")');
await p.waitForLoadState("networkidle");
await p.goto(`${BASE}/admin/timesheet?ym=2026-08&w=1`);
const otVal = await p.inputValue(`input[name="ot_${empId}"]`);
check("timesheet OT saved", otVal === "5", otVal);

// ---- pay run reflects it ----
await p.goto(`${BASE}/admin/payrun?ym=2026-08`);
const payrunText = await p.textContent("body");
check("pay run shows Test Worker", payrunText.includes("Test Worker"));

// ---- payslips render ----
await p.goto(`${BASE}/admin/payslips?ym=2026-08&emp=${empId}`);
const payslipText = await p.textContent("body");
check("payslip shows gross pay", payslipText.includes("Gross pay"));

// ---- bank file page + CSV export ----
await p.goto(`${BASE}/admin/bank?ym=2026-08`);
const [download] = await Promise.all([p.waitForEvent("download"), p.click('a:has-text("Download CSV")')]);
const csvPath = await download.path();
check("bank CSV downloaded", !!csvPath, csvPath);

// ---- reports ----
await p.goto(`${BASE}/admin/reports?year=2026`);
const reportsText = await p.textContent("body");
check("reports page shows Test Worker", reportsText.includes("Test Worker"));

// ---- settings: create staff user ----
await p.goto(`${BASE}/admin/settings`);
await p.fill('form:has(button:has-text("Create login")) input[name="name"]', "Colleague Test");
await p.fill('form:has(button:has-text("Create login")) input[name="email"]', "colleague-smoke@example.com");
await p.fill('form:has(button:has-text("Create login")) input[name="password"]', "colleaguepass123");
await p.selectOption('form:has(button:has-text("Create login")) select[name="role"]', "STAFF");
await p.click('button:has-text("Create login")');
await p.waitForLoadState("networkidle");
const settingsText = await p.textContent("body");
check("staff user appears in users list", settingsText.includes("colleague-smoke@example.com"));

await p.close();

// ---- staff login: verify restricted access ----
const p2 = await b.newPage();
await p2.goto(`${BASE}/login`);
await p2.fill('input[name="email"]', "colleague-smoke@example.com");
await p2.fill('input[name="password"]', "colleaguepass123");
await p2.click('button[type="submit"]');
await p2.waitForURL(/\/(admin|leave)/, { timeout: 10000 });
check("staff login redirects to /leave (not /admin)", /\/leave/.test(p2.url()), p2.url());

await p2.goto(`${BASE}/admin`);
await p2.waitForLoadState("networkidle");
check("staff blocked from /admin", !/\/admin$/.test(p2.url()), p2.url());

await p2.goto(`${BASE}/leave?ym=2026-08&w=1`);
const leaveBody = await p2.textContent("body");
check("staff leave page has no OT/salary fields", !leaveBody.includes("Overtime") && !leaveBody.includes("Monthly salary"));

await b.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log("FAILED:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
