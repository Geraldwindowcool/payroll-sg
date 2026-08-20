# Deploying Payroll SG to Vercel

This turns the app into something you and your colleague can both log into
from anywhere — you as Administrator (full payroll), them as Staff (MC and
leave entry only). Budget about 20 minutes for the whole thing; you only do
this once.

## 0. What you'll need

- A GitHub account (you said you have one)
- A Vercel account (you said you have one) — sign in at vercel.com with GitHub, it's free for this
- Node.js installed on your own computer, so you can run one command locally partway through

## 1. Push the code to GitHub

Unzip the project you were sent, then from a terminal inside that folder:

```bash
cd payroll-web
git remote -v          # should show nothing, or show it's already got history
```

If `git status` complains this isn't a repo, run `git init && git add -A && git commit -m "Payroll SG"` first — but the zip you received already has git history, so this is usually a no-op.

Create a new **empty** repository on GitHub (no README, no .gitignore — just
the bare repo), then:

```bash
git remote add origin https://github.com/<your-username>/payroll-sg.git
git branch -M main
git push -u origin main
```

## 2. Create the Vercel project

1. Go to vercel.com → **Add New… → Project**.
2. Import the `payroll-sg` GitHub repo you just pushed.
3. Framework preset should auto-detect **Next.js**. Leave the build settings as default.
4. **Don't click Deploy yet** — click **Environment Variables** first (or deploy once, it'll fail without a database, and that's fine — you'll fix it in the next steps and redeploy).

## 3. Add a Postgres database (Neon, via Vercel)

1. In your new Vercel project, go to the **Storage** tab.
2. Click **Create Database → Postgres** (this is Neon, running serverless Postgres — free tier is plenty for two users).
3. Once created, Vercel automatically adds a `DATABASE_URL` environment variable to your project. You don't need to copy/paste anything.

## 4. Set the remaining environment variables

Still in the Vercel project, go to **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `NEXTAUTH_SECRET` | A random string — generate one by running `openssl rand -base64 32` on your computer and pasting the output |
| `NEXTAUTH_URL` | Your project's URL, e.g. `https://payroll-sg.vercel.app` (you'll see the real one after the first deploy — come back and set this once you know it, then redeploy) |
| `ADMIN_EMAIL` | Your own email — this becomes your administrator login |
| `ADMIN_NAME` | Your name |
| `ADMIN_PASSWORD` | A password for your admin login — change it later if you like |

Apply all of these to the **Production** environment (and Preview/Development too, if you want branch previews to work).

## 5. Deploy

Click **Deploy**. Vercel builds and deploys the app. The build itself doesn't touch the database — it just compiles the app — so this step should succeed even before the database has any tables.

## 6. Run the database migration and seed (one-time, from your computer)

The database exists but is empty — it has no tables yet. Run this once,
from your own computer, pointed at the production database:

```bash
npm install -g vercel        # if you don't already have the Vercel CLI
cd payroll-sg                # the project folder
vercel link                  # connects this folder to the Vercel project you just made
vercel env pull .env.production.local   # downloads DATABASE_URL etc. from Vercel

npm install
npx dotenv -e .env.production.local -- npx drizzle-kit migrate
npx dotenv -e .env.production.local -- npm run db:seed
```

That last command creates your two companies (Window-Cool (S) Pte Ltd and
Window-Cool Sunshade Products) with their starter allowances and levy
tiers, and creates your administrator login from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`.

If `dotenv` isn't installed, `npm install -D dotenv-cli` first (it's a tiny dev tool, safe to add).

## 7. Fix NEXTAUTH_URL and redeploy

Now that you know your real Vercel URL (shown on the project's Overview
tab, or set a custom domain under **Settings → Domains**), go back to
**Settings → Environment Variables**, edit `NEXTAUTH_URL` to that exact
URL, and trigger a redeploy (**Deployments → ⋯ → Redeploy** on the latest one).

## 8. Log in and create your colleague's login

1. Visit your production URL. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Go to **Settings → Users & logins**.
3. Fill in your colleague's name, email, a password, and pick **Staff — can
   only key in MC/leave**. Click **Create login**.
4. Send them the URL, their email, and the password (a normal message is
   fine for two people — there's no invite-email flow in this version).
5. They log in and land straight on the leave-entry screen — no payroll,
   no salaries, no employee data, just MC/paid leave/unpaid leave for
   whichever week they pick. Whatever they save flows straight into your
   pay run automatically.

Your own login (Administrator) sees everything: employees, allowances,
timesheets, pay run, payslips, bank file, reports, settings — exactly as
before, just now backed by a real shared database instead of a single
browser's local storage.

## Day-to-day afterwards

- Add real employees under **Employees** (replacing/alongside any demo data).
- Adjust CPF rates, levy tiers and company bank details under **Settings** if MOM/CPF Board figures change.
- Everything your colleague enters under MC/leave shows up immediately in **Timesheet**, **Pay run** and **Reports** for you — no manual syncing.
- If you ever need to redeploy after making further code changes, just `git push` — Vercel redeploys automatically on every push to `main`. Schema changes need `npx drizzle-kit generate` + the migrate step from Section 6 run once against production before the new code goes live.

## If something goes wrong

- **"Configuration error" on login**: `NEXTAUTH_URL` doesn't match the real URL, or `NEXTAUTH_SECRET` isn't set. Recheck Section 4/7 and redeploy.
- **Blank pay run / "no company yet"**: the seed step (Section 6) didn't run, or ran against the wrong database. Re-run it.
- **Can't push migrations**: make sure `vercel env pull` actually wrote a `DATABASE_URL` into `.env.production.local` — open the file and check.
