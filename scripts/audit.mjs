import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();

async function login(p) {
  await p.goto(`${BASE}/login`);
  await p.fill('input[name="email"]', "preview@example.com");
  await p.fill('input[name="password"]', "preview12345");
  await p.click('button[type="submit"]');
  await p.waitForURL(/\/admin/, { timeout: 10000 });
}

const viewports = {
  desktop1300: { width: 1300, height: 900 },
  mobile390: { width: 390, height: 844 },
};

for (const [vname, vp] of Object.entries(viewports)) {
  const p = await b.newPage({ viewport: vp });
  await login(p);

  await p.goto(`${BASE}/admin/employees`, { waitUntil: "networkidle" });
  await p.click("text=+ Add an employee");
  await p.waitForTimeout(200);
  await p.screenshot({ path: `/tmp/shots/audit-${vname}-employees-add.png`, fullPage: true });

  const pages = [
    ["/admin", "overview"],
    ["/admin/timesheet", "timesheet"],
    ["/admin/allowances", "allowances"],
    ["/admin/payrun", "payrun"],
    ["/admin/bank", "bank"],
    ["/admin/reports", "reports"],
    ["/admin/settings", "settings"],
    ["/leave", "leave"],
  ];
  for (const [path, name] of pages) {
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(200);
    await p.screenshot({ path: `/tmp/shots/audit-${vname}-${name}.png`, fullPage: true });
  }
  await p.close();
}
await b.close();
console.log("done");
