import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`${BASE}/login`);
await p.fill('input[name="email"]', "preview@example.com");
await p.fill('input[name="password"]', "preview12345");
await p.click('button[type="submit"]');
await p.waitForURL(/\/admin/, { timeout: 10000 });

const routes = ["/admin", "/admin/employees", "/admin/timesheet", "/admin/allowances", "/admin/payrun", "/admin/bank", "/admin/reports", "/admin/settings"];
// warm up (first hit compiles the route in dev mode, which isn't representative)
for (const r of routes) await p.goto(`${BASE}${r}`, { waitUntil: "networkidle" });

const timings = [];
for (const r of routes) {
  const t0 = Date.now();
  await p.goto(`${BASE}${r}`, { waitUntil: "networkidle" });
  timings.push([r, Date.now() - t0]);
}
console.log(JSON.stringify(timings, null, 2));
await b.close();
