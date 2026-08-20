import { chromium } from "playwright";

const BASE = "http://localhost:3000";

const b = await chromium.launch();
const p = await b.newPage();

await p.goto(`${BASE}/login`);
await p.fill('input[name="email"]', "admin@example.com");
await p.fill('input[name="password"]', "change-me-please");
await p.click('button[type="submit"]');
await p.waitForURL(/\/(admin|leave)/, { timeout: 10000 });
console.log("logged in, url =", p.url());

await p.goto(`${BASE}/leave?ym=2026-08&w=1`);
await p.waitForSelector('input[name="mc_emp_test1"]');

await p.fill('input[name="mc_emp_test1"]', "1");
await p.fill('input[name="pl_emp_test1"]', "0");
await p.fill('input[name="ul_emp_test1"]', "2");
await p.click('button:has-text("Save leave")');
await p.waitForLoadState("networkidle");

console.log("after save, url =", p.url());
const mcVal = await p.inputValue('input[name="mc_emp_test1"]');
const ulVal = await p.inputValue('input[name="ul_emp_test1"]');
console.log("mc field after reload:", mcVal, "ul field after reload:", ulVal);

await b.close();
