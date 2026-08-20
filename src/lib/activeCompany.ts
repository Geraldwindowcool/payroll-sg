import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getCompanies } from "@/lib/payrollService";

const COOKIE = "activeCompanyId";

/** The signed-in user's currently selected company, defaulting to the
 *  first company on record if none is set yet or the cookie points at a
 *  company that no longer exists. Cached per-request — AppShell and the
 *  page it wraps both call this on every navigation, so without cache()
 *  it would work out the active company twice (each time re-reading the
 *  company list) for no reason. */
export const getActiveCompany = cache(async function getActiveCompany() {
  const all = await getCompanies();
  if (!all.length) return null;
  const jar = await cookies();
  const wanted = jar.get(COOKIE)?.value;
  return all.find((c) => c.id === wanted) ?? all[0];
});

export async function getActiveCompanyId() {
  const c = await getActiveCompany();
  return c?.id ?? null;
}

export const ACTIVE_COMPANY_COOKIE = COOKIE;
