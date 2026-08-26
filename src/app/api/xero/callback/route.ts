import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { completeXeroConnection } from "@/lib/xero";

/** Step 2 — Xero redirects back here with an authorization code after the
 *  admin approves the connection on Xero's own screen. */
export async function GET(req: NextRequest) {
  await requireAdmin();

  const fail = (msg: string) => NextResponse.redirect(new URL(`/admin/settings?xeroError=${encodeURIComponent(msg)}`, req.url));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieRaw = req.cookies.get("xero_oauth")?.value;
  if (!code || !state || !cookieRaw) return fail("Xero didn't send back what we expected — try connecting again.");

  let saved: { state: string; companyId: string };
  try {
    saved = JSON.parse(cookieRaw);
  } catch {
    return fail("Couldn't verify the connection request — try connecting again.");
  }
  if (saved.state !== state) return fail("The connection request couldn't be verified — try connecting again.");

  try {
    const tenantName = await completeXeroConnection(saved.companyId, code);
    const res = NextResponse.redirect(new URL(`/admin/settings?xeroConnected=${encodeURIComponent(tenantName)}`, req.url));
    res.cookies.delete("xero_oauth");
    return res;
  } catch (e) {
    return fail(e instanceof Error ? e.message : "The connection to Xero failed.");
  }
}
