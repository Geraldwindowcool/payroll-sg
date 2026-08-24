# Connecting a company to Xero

The **Admin → Xero** tab shows a company's Profit & Loss, budget vs actual,
and expense breakdown straight from Xero, next to the payroll cost this app
already calculates. Each company connects its own Xero organisation — if you
run payroll for more than one entity, connect each one separately from
Settings/Xero while that company is the active one in the switcher.

This is read-only: the app only ever requests report data from Xero, never
write access to your ledger.

## 1. Register a Xero app (one-time, ~5 minutes)

1. Go to https://developer.xero.com/app/manage and sign in with your Xero
   login.
2. **New app** → name it something like "Payroll SG" → app type **Web app**.
3. **Redirect URI** — add:
   - `http://localhost:3000/api/xero/callback` (for running it on your own
     computer)
   - `https://<your-production-domain>/api/xero/callback` (once you know
     your real deployed URL — you can add this later and redeploy, same as
     `NEXTAUTH_URL` in [DEPLOY.md](DEPLOY.md))
4. Under **Configuration**, note the **Client ID**, and click **Generate a
   secret** for the **Client Secret**. Copy both somewhere safe — the secret
   is only shown once.

You don't need to touch scopes in the developer portal — this app requests
`accounting.reports.read` and `accounting.settings.read` at connect time,
which is enough for P&L, budget and organisation info. It never asks for
transaction or contact write access.

## 2. Set environment variables

Add these alongside the ones in `.env.example` / your Vercel project
settings:

| Name | Value |
|---|---|
| `XERO_CLIENT_ID` | From step 1 |
| `XERO_CLIENT_SECRET` | From step 1 |
| `XERO_REDIRECT_URI` | `http://localhost:3000/api/xero/callback` locally, or your production callback URL when deployed |
| `XERO_TOKEN_KEY` | A 32-byte key used to encrypt the stored Xero tokens — generate with `openssl rand -base64 32` |

## 3. Run the migration

This adds one new table (`xero_connections`) — nothing else changes:

```bash
npm run db:generate
npm run db:migrate
```

(On Vercel/production, run these the same way you ran the migration in
[DEPLOY.md](DEPLOY.md) Section 6 — via `vercel env pull` then the same two
commands against `.env.production.local`.)

## 4. Connect

1. Log in as an administrator, make sure the right company is selected in
   the switcher at the top, then go to **Xero**.
2. Click **Connect to Xero**, log in to Xero, and pick the organisation to
   authorize when prompted.
3. You're redirected back showing that month's P&L, budget (if the org has
   one set up under Xero's Business → Budgets), expenses, and payroll cost.

## Reconnecting

Xero's connection lapses if it's not used for 60 days, or if you revoke it
from Xero's side (**Settings → Connected apps** in Xero). If that happens
the Xero tab shows a "Reconnect" prompt — click it and repeat the login step
above; nothing else needs to change.

## Notes

- Xero's own Payroll product isn't available for Singapore, so "Payroll" on
  this tab is always this app's own calculation (CPF, SDL, levies) — Xero
  only supplies the P&L, budget and expense figures.
- If a company authorizes more than one Xero organisation during login,
  this app links the first one Xero returns. Disconnect and reconnect,
  choosing only the organisation you want, if that's not the right one.
