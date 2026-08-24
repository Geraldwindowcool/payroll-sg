import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
await p.goto(`${BASE}/login`);
await p.fill('input[name="email"]', "preview@example.com");
await p.fill('input[name="password"]', "preview12345");
await p.click('button[type="submit"]');
await p.waitForURL(/\/admin/, { timeout: 10000 });

await p.goto(`${BASE}/admin/employees`, { waitUntil: "networkidle" });
await p.click("text=+ Add an employee");
await p.fill('input[name="name"]', "Test Worker");
await p.fill('input[name="nric"]', "s1234567a");
await p.fill('input[name="salary"]', "2200");
await p.screenshot({ path: "/tmp/shots/nric-form.png", fullPage: true });
await p.click('button:has-text("Add employee")');
await p.waitForURL(/\/admin\/employees\/.+/, { timeout: 10000 });
await p.waitForTimeout(300);
await p.screenshot({ path: "/tmp/shots/nric-detail.png", fullPage: true });

await p.goto(`${BASE}/admin/employees`, { waitUntil: "networkidle" });
await p.screenshot({ path: "/tmp/shots/nric-list.png", fullPage: true });
await b.close();
console.log("done");
