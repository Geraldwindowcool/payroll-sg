import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERROR:", m.text()); });

await p.goto(`${BASE}/login`);
await p.waitForTimeout(300);
await p.screenshot({ path: "/tmp/shots/1-login.png" });

await p.fill('input[name="email"]', "preview@example.com");
await p.fill('input[name="password"]', "preview12345");
await p.click('button[type="submit"]');
try {
  await p.waitForURL(/\/(admin|leave)/, { timeout: 8000 });
  console.log("Logged in, at:", p.url());
} catch (e) {
  console.log("LOGIN FAILED, url:", p.url());
  const body = await p.textContent("body").catch(()=> "");
  console.log("BODY SNIPPET:", body?.slice(0,300));
}

const pages = [
  ["/admin", "2-overview"],
  ["/admin/employees", "3-employees"],
  ["/admin/timesheet", "4-timesheet"],
  ["/admin/allowances", "5-allowances"],
  ["/admin/payrun", "6-payrun"],
  ["/admin/bank", "7-bank"],
  ["/admin/reports", "8-reports"],
  ["/admin/settings", "9-settings"],
];
for (const [path, name] of pages) {
  try {
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15000 });
    await p.waitForTimeout(300);
    await p.screenshot({ path: `/tmp/shots/${name}.png`, fullPage: true });
    console.log("shot:", name);
  } catch (e) {
    console.log("FAILED:", name, e.message);
  }
}
await b.close();
