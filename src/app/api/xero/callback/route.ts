import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { exchangeXeroCode, saveXeroConnection } from "@/lib/xero";

/** Step 2 — Xero redirects back here with an authorization code after the
 *  admin approves the connection on Xero's own screen.
 *
 *  If the resulting tokens only reach one organisation, we save it
 *  immediately. If they reach more than one — which happens the moment a
 *  second company connects, since Xero's grant accumulates across
 *  connect attempts rather than resetting each time — we can't guess
 *  which one this company means, so we stash the tokens in a short-lived
 *  cookie and send the admin to a picker on the Settings page instead. */
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
    const { tokens, tenants } = await exchangeXeroCode(code);

    if (tenants.length === 1) {
      await saveXeroConnection(saved.companyId, tenants[0], tokens);
      const res = NextResponse.redirect(new URL(`/admin/settings?xeroConnected=${encodeURIComponent(tenants[0].tenantName)}`, req.url));
      res.cookies.delete("xero_oauth");
      return res;
    }

    // More than one organisation is reachable — ask which one this
    // company is, rather than guessing.
    const res = NextResponse.redirect(new URL("/admin/settings?xeroPick=1", req.url));
    res.cookies.delete("xero_oauth");
    res.cookies.set(
      "xero_pending",
      JSON.stringify({ companyId: saved.companyId, tokens, tenants }),
      { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" }
    );
    return res;
  } catch (e) {
    return fail(e instanceof Error ? e.message : "The connection to Xero failed.");
  }
}
