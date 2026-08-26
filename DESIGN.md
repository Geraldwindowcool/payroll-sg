# Payroll SG — Design System

*Extracted from the existing codebase (`src/app/globals.css` and page conventions), not invented. This documents what the app already does consistently, so new screens (like the Attendance/Timesheet redesign) match instead of drifting.*

## 0. Scope note

This is an internal payroll/HR data-entry tool for a small Singapore business — administrators and one or two staff logins, not a public site. The taste-skill fit here is **operational/restrained**: no marketing-page treatment (no glassmorphism, scroll-triggered motion, hero imagery, decorative gradients). Every existing page already follows this discipline; this file exists to keep it that way as the app grows, not to change direction.

## 1. Atmosphere & Identity

A quiet paper ledger, not a SaaS dashboard. Warm off-white paper background, ink-black text, a serif (Newsreader) for page titles and card headings that gives it a bookkeeping/stationery feel against otherwise plain sans-serif UI chrome. The signature: **restraint communicates trustworthiness** — a payroll tool should look like it takes money seriously, which here means calm, unhurried spacing and almost no color except where color carries real meaning (status pills, the one blue accent for interactive elements).

## 2. Color

| Role | Token | Value | Usage |
|---|---|---|---|
| Page background | `--paper` | `#faf9f6` | `<body>` |
| Card/input surface | `--surface` | `#ffffff` | Cards, inputs |
| Recessed surface | `--surface-2` | `#f3f1ec` | Skeleton loaders, subtle fills |
| Deeper recessed | `--surface-3` | `#ece8de` | Rarely used, deepest fill |
| Text/primary | `--ink` | `#1c1b19` | Headings, primary text |
| Text/secondary | `--ink-2` | `#4a4944` | Body copy |
| Text/tertiary | `--ink-3` | `#6b6b66` | Hints, captions, secondary labels |
| Border/default | `--line` | `#e6e3da` | Card borders, dividers |
| Border/strong | `--line-strong` | `#d8d4c8` | Input borders |
| Accent | `--accent` / `--accent-ink` | `#2563eb` / `#1d4ed8` | Links, primary buttons, focus rings, the ONE color used for interactivity |
| Accent soft | `--accent-soft` | `#e8eefd` | Accent pill background, focus-ring glow |
| Success | `--good` / `--good-soft` / `--good-line` | `#166534` / `#e7f4ea` / `#bfe2c8` | Active status, paid leave |
| Warning | `--warn` / `--warn-soft` / `--warn-line` | `#92400e` / `#fdf1de` / `#f2dcae` | MC, cautions |
| Error | `--bad` / `--bad-soft` / `--bad-line` | `#991b1b` / `#fbe9e9` / `#f0c6c6` | Inactive status, unpaid leave, destructive actions |

### Rules (already enforced across the app)
- Accent blue is used ONLY for interactive elements (links, primary buttons, focus rings, the active nav tab) — never decorative.
- Status color (green/amber/red/gray/blue) always pairs a soft background + matching line + matching ink text — see `.pill` and the leave-calendar day states. Never a solid color fill with white text except on `.btn.pri`.
- No gradients, no glassmorphism, no drop shadows beyond the two defined levels below.

## 3. Typography

- **Serif** (`--font-serif`: Newsreader, Georgia, Times New Roman) — page `<h1>`, card `<h2>` headings only. Never body text, never form labels.
- **Sans** (`--font-sans`: system font stack) — everything else: labels, body, buttons, table cells.
- **Mono** (`--font-mono`: JetBrains Mono) — small uppercase eyebrows/captions/section dividers (`.cap`, `.eyebrow`, `.hint` in some places) and numeric-heavy contexts (money columns use `font-variant-numeric: tabular-nums` via `.inp.num` / `.n`).

### Scale in use
Page `<h1>` ≈ 26–28px serif · card `<h2>` ≈ 14–16px serif · body/labels 13–14px sans · hints/captions 10.5–12px sans or mono uppercase with `letter-spacing: 0.04–0.08em`.

### Rules
- Never introduce a third body font.
- Uppercase lettered captions (`.cap`, `.eyebrow`) always get `letter-spacing` — bare uppercase without tracking reads as a mistake, not a style.

## 4. Spacing

4px-derived scale, already tokenized — reach for these, never a raw px value:

| Token | Value |
|---|---|
| `--sp-1` | 4px |
| `--sp-2` | 8px |
| `--sp-3` | 12px |
| `--sp-4` | 16px |
| `--sp-5` | 20px |
| `--sp-6` | 28px |
| `--sp-7` | 40px |
| `--sp-8` | 56px |

Radii: `--r-sm` 7px (inputs, pills' inner elements, calendar cells) · `--r-md` 12px (cards) · `--r-lg` 16px (rarely used, larger surfaces).

Layout primitives already in use: `.stack` / `.stack-lg` (vertical rhythm), `.fields` / `.fields.tight` (responsive `repeat(auto-fit, minmax(…,1fr))` form grids — this IS the "switcher" primitive, already load-bearing, do not replace with ad-hoc flex), `.flex.items-center.gap-*` (Tailwind utility cluster), `.tw` (horizontal-scroll wrapper for wide tables — the app's existing overflow-safe answer to wide content on narrow screens).

## 5. Components (existing, reused 2+ times)

- **`.card`** — white surface, `--line` border, `--r-md` radius, `--shadow-sm`. Optional `.hd` (header row: title + trailing hint/action) and `.bd` (body, padded). This is the one surface-elevation primitive in the app (see Section 7 — tonal/border strategy, not shadow-heavy).
- **`.fgroup` + `.cap`** — a labeled section within a form (e.g. "Personal", "Pay & CPF"), caption in mono uppercase.
- **`.fields` / `.fields.tight`** — responsive form grid, defined in Section 4.
- **`label.f`** — a form field: label text above, one control below. Labels reserve 2 lines of height globally (a real bug fix from earlier in this project — long labels must not throw off row alignment with neighbors).
- **`.inp`** — text/number/select/textarea input. `.inp.num` right-aligns with tabular numerals for money/quantity fields.
- **`.btn`** — button. Bare = secondary, `.pri` = primary (ink-filled), `.danger` = destructive, `.sm` = compact. All have hover + focus-visible states already defined.
- **`.pill`** — status chip. Variants `.green` `.amber` `.red` `.gray` `.blue`, each soft-bg + matching border + matching text.
- **`.tw`** table wrapper — horizontal scroll container for wide tables, so a table never breaks mobile layout.
- **`.disclosure`** (paired with `.card`) — `<details>`-based collapsible section, used for "+ Add" forms and the Settings employee-access checklist.
- **`.skeleton`** — pulse-animated loading placeholder (`prefers-reduced-motion` already disables the animation).
- **Company-switch overlay** (`.company-switch-overlay` / `.company-switch-card` / `.spinner`) — full-viewport dimmed overlay with a spinning ring, shown during a pending company switch.
- **Leave calendar** (`.cal` / `.cal-cell` / `.cal-tag` / `.cal-cell.today`) — month grid, one cell per day, color-coded by leave type using the same soft-bg/line/text status pattern as `.pill`. A quiet inset ring (not a fill) marks today.
- **`.mini-stats` / `.mini-stat`** *(added this pass)* — compact k/v caption row for a secondary summary line under a page/card heading (e.g. "this month: 1.5 MC, 1 leave"). Reuses the `.stat` tile's key/value vocabulary at a smaller scale; gap-only separation (no divider lines — a vertical rule as a flex sibling orphans itself the moment the row wraps on a narrow screen). Used on Attendance, Timesheet, and Leave.
- **`.picker-group`** *(added this pass)* — joins a `<select>` with adjacent prev/next buttons into one bordered cluster so they read as a single control rather than three floating pieces. Used by `EmployeePicker`.
- **`.leave-type-btn`** *(added this pass)* — a `.btn` variant carrying a small color swatch (`.swatch.MC/.PL/.UL`) and, when active, a soft-bg tint matching that leave type's color — ties the calendar's "which type am I marking" control to the same color language as the cells it produces and `.pill` elsewhere in the app.

### States already covered
Every `.btn` and `.inp` has hover/focus-visible. `.cal-cell` has hover/focus-visible/disabled/off (non-working-day) states. Table rows (`tbody tr:hover`) get a subtle highlight. Nav tabs and week-selector links have `.on`/active states.

## 6. Motion & Interaction

- Only `.skeleton`'s opacity pulse and `.spinner`'s rotation exist as continuous animations — both respect `prefers-reduced-motion: reduce` (already implemented).
- Transitions are short and functional only: `border-color`/`box-shadow`/`background` on hover/focus, ~120–150ms ease. No entrance animations, no scroll-triggered motion, no page transitions.
- This is intentional and correct for the product — do not add motion for its own sake.

## 7. Depth & Surface

**Strategy: mostly borders, shadows used sparingly for genuine elevation only.** `--shadow-sm` on cards at rest (barely perceptible — reads more as a border reinforcement than a "floating" surface). `--shadow-md` reserved for things that should read as elevated above the page (the company-switch overlay card). No `backdrop-filter`, no glass, no glow effects.

## 8. Accessibility Constraints & Accepted Debt

### Constraints
- Every interactive element needs a visible `:focus-visible` state (already the pattern for `.btn`/`.inp`; carry it to any new interactive primitive, e.g. `.cal-cell`, `EmployeePicker`'s prev/next buttons).
- `prefers-reduced-motion` must be respected by any new animation, matching `.skeleton` and `.spinner`.
- Status must never be color-only — pills and calendar-day tags always pair color with a text label (MC/AL/UL, Active/Inactive), not just a colored dot.

### Accepted Debt
| Item | Location | Why accepted | Owner / Exit |
|---|---|---|---|
| Some `.hint`/`.cap` text sits close to WCAG AA's 4.5:1 floor against `--surface` (`--ink-3` on white) | app-wide, e.g. table sub-labels | Established pattern predates this file; not introduced by this pass | Flag for a future dedicated contrast pass, not blocking this polish work |

*(No new debt introduced by this pass — see the Attendance/Timesheet polish log below.)*
