import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/access";
import { getActiveCompanyId } from "@/lib/activeCompany";
import { buildXeroAuthorizeUrl } from "@/lib/xero";

/** Step 1 of the one-time "Connect to Xero" handshake — sends the admin to
 *  Xero's own login/consent screen. The random `state` value round-trips
 *  through Xero and back to our callback so we can confirm the response
 *  really answers a request we made (CSRF protection), and doubles as a
 *  way to remember which company was active when the click happened. */
export async function GET(req: NextRequest) {
  await requireAdmin();
  const companyId = await getActiveCompanyId();
  if (!companyId) {
    return NextResponse.redirect(new URL("/admin/settings", req.url));
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildXeroAuthorizeUrl(state));
  res.cookies.set("xero_oauth", JSON.stringify({ state, companyId }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });
  return res;
}
