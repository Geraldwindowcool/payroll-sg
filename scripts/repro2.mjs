import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
for (const w of [700, 750, 820, 900, 950]) {
  const p = await b.newPage({ viewport: { width: w, height: 1200 } });
  await p.goto(`${BASE}/login`);
  await p.fill('input[name="email"]', "preview@example.com");
  await p.fill('input[name="password"]', "preview12345");
  await p.click('button[type="submit"]');
  await p.waitForURL(/\/admin/, { timeout: 10000 });
  await p.goto(`${BASE}/admin/employees`, { waitUntil: "networkidle" });
  await p.click("text=+ Add an employee");
  await p.waitForTimeout(150);
  await p.screenshot({ path: `/tmp/shots/repro2-${w}.png`, fullPage: true });
  await p.close();
}
await b.close();
console.log("done");
