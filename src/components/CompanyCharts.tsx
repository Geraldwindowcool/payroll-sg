import { linearScale } from "@/lib/chartScale";
import { money0 } from "@/lib/payroll";

// Small, dependency-free inline-SVG charts for the "All companies"
// dashboard. No client JS — hover detail rides on native SVG <title>
// tooltips, which need no interactivity to render or to work.

const INCOME_COLOR = "var(--chart-income)";
const EXPENSE_COLOR = "var(--chart-expense)";

/** A bar path with a 4px rounded corner at the "data end" (the tip away
 *  from the baseline) and a square corner at the baseline — never rounded
 *  on all four corners, per the mark spec. */
function barPath(x: number, yTop: number, width: number, height: number, roundTop: boolean): string {
  if (height <= 0.01) return "";
  const r = Math.min(4, width / 2, height);
  if (r <= 0.01) return `M${x},${yTop} h${width} v${height} h${-width} Z`;
  return roundTop
    ? `M${x},${yTop + r} a${r},${r} 0 0 1 ${r},${-r} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - r} h${-width} Z`
    : `M${x},${yTop} h${width} v${height - r} a${r},${r} 0 0 1 ${-r},${r} h${-(width - 2 * r)} a${r},${r} 0 0 1 ${-r},${-r} Z`;
}

function shortCompanyName(name: string): string {
  return name.replace(/^Window-Cool\s*/i, "").trim() || name;
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 12, color: "var(--ink-3)" }}>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2">
          <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color, display: "inline-block" }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

const W = 640;
const H = 220;
const PAD_TOP = 14;
const PAD_BOTTOM = 28;
const PAD_X = 8;
const PLOT_W = W - PAD_X * 2;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

/** Grouped bars — income vs. expense, one group per company, for one
 *  month. Answers "who's bringing in money vs. spending it" at a glance. */
export function IncomeExpenseByCompanyChart({ rows }: { rows: { label: string; income: number; expense: number }[] }) {
  const values = rows.flatMap((r) => [r.income, r.expense]);
  const scale = linearScale(values, PLOT_H);
  const groupW = PLOT_W / Math.max(rows.length, 1);
  const barW = Math.min(24, groupW / 3);
  const gap = 4;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <Legend items={[{ color: INCOME_COLOR, label: "Income" }, { color: EXPENSE_COLOR, label: "Expenses" }]} />
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Income vs expenses by company">
        <line x1={PAD_X} y1={PAD_TOP + PLOT_H} x2={PAD_X + PLOT_W} y2={PAD_TOP + PLOT_H} stroke="var(--line)" strokeWidth={1} />
        {rows.map((r, i) => {
          const cx = PAD_X + groupW * i + groupW / 2;
          const incomeH = scale.toPixel(r.income);
          const expenseH = scale.toPixel(r.expense);
          const baseline = PAD_TOP + PLOT_H;
          const x1 = cx - barW - gap / 2;
          const x2 = cx + gap / 2;
          return (
            <g key={r.label}>
              <path d={barPath(x1, baseline - incomeH, barW, incomeH, true)} fill={INCOME_COLOR}>
                <title>{`${r.label} — Income: ${money0(r.income)}`}</title>
              </path>
              <path d={barPath(x2, baseline - expenseH, barW, expenseH, true)} fill={EXPENSE_COLOR}>
                <title>{`${r.label} — Expenses: ${money0(r.expense)}`}</title>
              </path>
              <text x={cx} y={PAD_TOP + PLOT_H + 18} textAnchor="middle" fontSize={11} fill="var(--ink-3)">
                {shortCompanyName(r.label)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** One bar per company — net cashflow for the month, colored by sign
 *  rather than by identity (a single series doesn't need a legend; the
 *  color itself is the story: green means the company is cashflow
 *  positive, red means it isn't). */
export function NetCashflowByCompanyChart({ rows }: { rows: { label: string; value: number }[] }) {
  const scale = linearScale(rows.map((r) => r.value), PLOT_H);
  const groupW = PLOT_W / Math.max(rows.length, 1);
  const barW = Math.min(40, groupW * 0.5);
  // scale.zeroPixel is measured from the bottom (0) upward; convert to an
  // absolute SVG y within the plot area (SVG y grows downward).
  const zeroY = PAD_TOP + PLOT_H - scale.zeroPixel;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Net cashflow by company">
      <line x1={PAD_X} y1={zeroY} x2={PAD_X + PLOT_W} y2={zeroY} stroke="var(--line)" strokeWidth={1} />
      {rows.map((r, i) => {
        const cx = PAD_X + groupW * i + groupW / 2;
        const h = Math.abs(scale.toPixel(r.value) - scale.zeroPixel);
        const good = r.value >= 0;
        const yTop = good ? zeroY - h : zeroY;
        const labelY = good ? zeroY - h - 6 : zeroY + h + 14;
        return (
          <g key={r.label}>
            <path d={barPath(cx - barW / 2, yTop, barW, h, good)} fill={good ? "var(--good)" : "var(--bad)"}>
              <title>{`${r.label} — Net cashflow: ${money0(r.value)}`}</title>
            </path>
            <text x={cx} y={labelY} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink)">
              {money0(r.value)}
            </text>
            <text x={cx} y={PAD_TOP + PLOT_H + 18} textAnchor="middle" fontSize={11} fill="var(--ink-3)">
              {shortCompanyName(r.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Combined income vs. expenses across every company, by month —
 *  answers "is this getting better or worse over the year". */
export function IncomeExpenseTrendChart({ months }: { months: { ym: string; income: number; expense: number }[] }) {
  const values = months.flatMap((m) => [m.income, m.expense]);
  const scale = linearScale(values, PLOT_H);
  const stepX = PLOT_W / Math.max(months.length - 1, 1);
  const baseline = PAD_TOP + PLOT_H;

  const linePoints = (key: "income" | "expense") =>
    months.map((m, i) => ({ x: PAD_X + stepX * i, y: baseline - scale.toPixel(m[key]), v: m[key] }));

  const income = linePoints("income");
  const expense = linePoints("expense");
  const toPath = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div className="stack" style={{ gap: 8 }}>
      <Legend items={[{ color: INCOME_COLOR, label: "Income" }, { color: EXPENSE_COLOR, label: "Expenses" }]} />
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Combined income vs expenses by month">
        <line x1={PAD_X} y1={baseline} x2={PAD_X + PLOT_W} y2={baseline} stroke="var(--line)" strokeWidth={1} />
        <line x1={PAD_X} y1={PAD_TOP} x2={PAD_X + PLOT_W} y2={PAD_TOP} stroke="var(--line)" strokeWidth={1} />

        <path d={toPath(income)} fill="none" stroke={INCOME_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={toPath(expense)} fill="none" stroke={EXPENSE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {income.map((p, i) => (
          <circle key={`i-${i}`} cx={p.x} cy={p.y} r={4} fill={INCOME_COLOR} stroke="var(--surface)" strokeWidth={2}>
            <title>{`${months[i].ym} — Income: ${money0(p.v)}`}</title>
          </circle>
        ))}
        {expense.map((p, i) => (
          <circle key={`e-${i}`} cx={p.x} cy={p.y} r={4} fill={EXPENSE_COLOR} stroke="var(--surface)" strokeWidth={2}>
            <title>{`${months[i].ym} — Expenses: ${money0(p.v)}`}</title>
          </circle>
        ))}

        {income.length > 0 && (
          <text x={income[income.length - 1].x} y={income[income.length - 1].y - 8} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--ink)">
            {money0(income[income.length - 1].v)}
          </text>
        )}
        {expense.length > 0 && (
          <text x={expense[expense.length - 1].x} y={expense[expense.length - 1].y + 16} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--ink)">
            {money0(expense[expense.length - 1].v)}
          </text>
        )}

        {months.map((m, i) => (
          <text key={m.ym} x={PAD_X + stepX * i} y={PAD_TOP + PLOT_H + 18} textAnchor="middle" fontSize={10} fill="var(--ink-3)">
            {new Date(m.ym + "-01").toLocaleString("en-SG", { month: "short" })}
          </text>
        ))}
      </svg>
    </div>
  );
}
