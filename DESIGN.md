# Payroll SG — Design System

*Originally extracted from the codebase's "editorial minimalism" look; revised on request to a "modern SaaS dashboard" direction, matched against a supplied reference screenshot (a platform-ops dashboard: dark icon sidebar, white rounded cards, bold black numbers, indigo accent, colored deltas). Navigation position was deliberately kept as top tabs rather than adopting the reference's left sidebar — changing where every button lives wasn't worth it for two non-technical daily users who already know the current layout. Everything else — color, type, card treatment — follows the reference.*

## 0. Scope note

This is an internal payroll/HR data-entry tool for a small Singapore business — administrators and one or two staff logins, not a public site. Still operational/restrained in spirit (no glassmorphism, scroll-triggered motion, hero imagery, decorative gradients) — the "modern SaaS" reference itself is calm and functional, not flashy, so this revision is a palette/type change, not a swing toward marketing-site treatment.

## 1. Atmosphere & Identity

A clean, modern operations dashboard — light slate-gray background, white cards with hairline borders, bold black sans-serif numbers doing the talking, one indigo accent reserved for interactive elements, green/red used only where a number is genuinely good or bad news. The signature: **numbers first** — a stat tile's value is the biggest, boldest thing on the page, its label small and quiet above it, matching how the reference makes "847" and "$42.8k" read instantly while "Active workloads" and "Monthly spend" stay out of the way.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---|---|
| Page background | `--paper` | `#f8fafc` | `<body>` |
| Card/input surface | `--surface` | `#ffffff` | Cards, inputs |
| Recessed surface | `--surface-2` | `#f1f5f9` | Skeleton loaders, subtle fills, table header background |
| Deeper recessed | `--surface-3` | `#e2e8f0` | Rarely used, deepest fill |
| Text/primary | `--ink` | `#0f172a` | Headings, primary text, the dark "accent" stat tile background |
| Text/secondary | `--ink-2` | `#334155` | Body copy |
| Text/tertiary | `--ink-3` | `#64748b` | Hints, captions, secondary labels |
| Border/default | `--line` | `#e2e8f0` | Card borders, dividers |
| Border/strong | `--line-strong` | `#cbd5e1` | Input borders |
| Accent | `--accent` / `--accent-ink` | `#4f46e5` / `#4338ca` | Links, primary buttons, focus rings, active nav tab — the ONE color used for interactivity |
| Accent soft | `--accent-soft` | `#eef2ff` | Accent pill background, focus-ring glow |
| Success | `--good` / `--good-soft` / `--good-line` | `#16a34a` / `#e7f4ea` / `#bfe2c8` | Active status, paid leave, positive deltas |
| Warning | `--warn` / `--warn-soft` / `--warn-line` | `#92400e` / `#fdf1de` / `#f2dcae` | MC, cautions |
| Error | `--bad` / `--bad-soft` / `--bad-line` | `#dc2626` / `#fbe9e9` / `#f0c6c6` | Inactive status, unpaid leave, destructive actions, critical deltas |

### Rules (already enforced across the app)
- Accent indigo is used ONLY for interactive elements (links, primary buttons, focus rings, the active nav tab) — never decorative.
- Status color (green/amber/red/gray/blue) always pairs a soft background + matching line + matching ink text — see `.pill` and the leave-calendar day states. Never a solid color fill with white text except on `.btn.pri`.
- No gradients, no glassmorphism, no drop shadows beyond the two defined levels below.

## 3. Typography

- **Sans** (`--font-sans`: system font stack) — everything, including headings. `h1`/`h2`/`h3` are bold (700), `.stat .v` is extra-bold (800) — the reference's headings and big numbers are bold sans, not a display/serif face, so headings and body now share one family, differentiated by weight and size rather than by typeface.
- **Mono** (`--font-mono`: JetBrains Mono) — kept only for a handful of small, dense, glanceable bits where tabular alignment matters: table `th` money columns' `font-variant-numeric: tabular-nums`, the leave calendar's day-of-week/date-badge text. No longer used for eyebrows, captions, or stat labels — those moved to plain sans to match the reference's plain gray sentence-case labels ("Active workloads", not "ACTIVE WORKLOADS").
- Serif (`--font-serif`, Newsreader) is defined but unused — kept in case a future deliberate exception wants it back, but no component should reach for it.

### Scale in use
Page `<h1>` ≈ 28px bold sans · card `<h2>` ≈ 16px bold sans · stat value ≈ 34px extra-bold sans · body/labels 13–14px sans · hints/captions 12–13px sans, regular/medium weight, no letter-spacing.

### Rules
- Never introduce a third body font.
- Labels are plain sentence case now, not uppercase-with-tracking — don't reintroduce uppercase micro-labels without a specific reason; it was a deliberate change away from the earlier "editorial caption" style.

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

**Strategy: mostly borders, shadows used sparingly for genuine elevation only.** `--shadow-sm` on cards at rest (barely perceptible — reads more as a border reinforcement than a "floating" surface, matching the reference's near-flat white cards). `--shadow-md` reserved for things that should read as elevated above the page (the company-switch overlay card). Radii were bumped up (`--r-sm` 8px, `--r-md` 14px, `--r-lg` 20px) for a rounder, more "SaaS dashboard" card shape than the earlier tighter corners. No `backdrop-filter`, no glass, no glow effects.

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
