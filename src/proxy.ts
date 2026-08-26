import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Route protection:
// - /login is public.
// - /leave is available to any signed-in user (STAFF or ADMIN) — this is
//   the MC / paid leave / unpaid leave entry screen your colleague uses.
// - /admin/** requires the ADMIN role — full payroll access.
// - Everything else requires a session.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/login")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : "/leave", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/leave", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Static assets (logo, icons, etc. under /public) are excluded by
  // extension so they load for a signed-out visitor too — the login page
  // itself needs to show the logo before anyone has a session. This was a
  // latent gap: nothing in /public was actually referenced by a page until
  // now, so a plain-file request never hit this matcher before.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)"],
};
