import "server-only";
import { db } from "@/db";
import { xeroConnections, type XeroConnection } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseTotalIncome, type XeroReportResponse } from "@/lib/xeroReport";

const XERO_AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";
const XERO_PNL_REPORT_URL = "https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss";

// offline_access is what lets us keep refreshing the connection forever
// without Gerald ever having to log into Xero again after the first click.
const SCOPES = "offline_access accounting.reports.profitandloss.read";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} — set it in Vercel's environment variables.`);
  return v;
}

function basicAuthHeader(): string {
  const raw = `${env("XERO_CLIENT_ID")}:${env("XERO_CLIENT_SECRET")}`;
  return "Basic " + Buffer.from(raw).toString("base64");
}

export function buildXeroAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env("XERO_CLIENT_ID"),
    redirect_uri: env("XERO_REDIRECT_URI"),
    scope: SCOPES,
    state,
  });
  return `${XERO_AUTHORIZE_URL}?${params.toString()}`;
}

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function requestTokens(body: URLSearchParams): Promise<XeroTokenResponse> {
  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuthHeader() },
    body,
  });
  if (!res.ok) throw new Error(`Xero didn't accept that request (${res.status}). You may need to reconnect Xero in Settings.`);
  return res.json();
}

async function fetchConnectedTenants(accessToken: string): Promise<{ tenantId: string; tenantName: string }[]> {
  const res = await fetch(XERO_CONNECTIONS_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Couldn't look up your Xero organisation (${res.status}).`);
  return res.json();
}

/** Completes the OAuth handshake for a company: exchanges the code Xero
 *  handed back, finds which organisation was authorized, and stores (or
 *  replaces) that company's connection. Returns the organisation's name
 *  for a friendly confirmation message. */
export async function completeXeroConnection(companyId: string, code: string): Promise<string> {
  const tokens = await requestTokens(
    new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: env("XERO_REDIRECT_URI") })
  );
  const tenants = await fetchConnectedTenants(tokens.access_token);
  const tenant = tenants[0];
  if (!tenant) throw new Error("Xero didn't return any connected organisation — try connecting again.");

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await db
    .insert(xeroConnections)
    .values({
      companyId,
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: xeroConnections.companyId,
      set: { tenantId: tenant.tenantId, tenantName: tenant.tenantName, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt, updatedAt: new Date() },
    });

  return tenant.tenantName;
}

export async function getXeroConnection(companyId: string): Promise<XeroConnection | null> {
  const [row] = await db.select().from(xeroConnections).where(eq(xeroConnections.companyId, companyId)).limit(1);
  return row ?? null;
}

export async function disconnectXero(companyId: string) {
  await db.delete(xeroConnections).where(eq(xeroConnections.companyId, companyId));
}

/** Refreshes the access token if it's expired (or about to be), returning
 *  a connection guaranteed usable right now. Xero rotates the refresh
 *  token on every use, so the new one is saved immediately — reusing a
 *  spent refresh token would break the next refresh. */
async function ensureFreshToken(conn: XeroConnection): Promise<XeroConnection> {
  if (conn.expiresAt.getTime() - Date.now() > 60_000) return conn;

  const tokens = await requestTokens(new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refreshToken }));
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const [updated] = await db
    .update(xeroConnections)
    .set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt, updatedAt: new Date() })
    .where(eq(xeroConnections.id, conn.id))
    .returning();
  return updated;
}

/** Total revenue for a date range, pulled live from the company's
 *  connected Xero organisation's Profit & Loss report (accrual basis,
 *  matching how Xero itself reports revenue). */
export async function getXeroRevenueForRange(companyId: string, startDate: string, endDate: string): Promise<{ revenue: number; tenantName: string }> {
  const conn = await getXeroConnection(companyId);
  if (!conn) throw new Error("This company isn't connected to Xero yet — connect it in Settings first.");
  const fresh = await ensureFreshToken(conn);

  const url = new URL(XERO_PNL_REPORT_URL);
  url.searchParams.set("fromDate", startDate);
  url.searchParams.set("toDate", endDate);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${fresh.accessToken}`, "xero-tenant-id": fresh.tenantId, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Xero's report request failed (${res.status}).`);
  const report: XeroReportResponse = await res.json();

  return { revenue: parseTotalIncome(report), tenantName: fresh.tenantName };
}
