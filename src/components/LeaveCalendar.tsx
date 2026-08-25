"use client";

import { useState } from "react";
import type { LeaveDayEntry, LeaveType } from "@/lib/leave";

const TYPES: { key: LeaveType; label: string; short: string }[] = [
  { key: "MC", label: "MC (paid)", short: "MC" },
  { key: "PL", label: "Leave (paid)", short: "AL" },
  { key: "UL", label: "Unpaid leave", short: "UL" },
];

type Marked = { type: LeaveType; half: boolean };

/** Month calendar for marking exactly which days someone was on MC or
 *  leave. Pick the type you're marking, then click dates: first click
 *  marks a full day, second makes it a half day, third clears it.
 *
 *  Non-working days (Sundays always, Saturdays on a 5-day week) are shown
 *  greyed and can't be marked — marking them would be recorded as zero
 *  days anyway, so letting people click them would only be misleading.
 *
 *  State is posted as one hidden field, `leaveDays`, holding
 *  "YYYY-MM-DD:TYPE:half" entries — the server re-derives the week totals
 *  from these rather than trusting anything the page calculated. */
export default function LeaveCalendar({
  ym,
  pattern,
  initial,
  disabled = false,
}: {
  ym: string;
  pattern: number;
  initial: LeaveDayEntry[];
  disabled?: boolean;
}) {
  const [marks, setMarks] = useState<Map<string, Marked>>(
    () => new Map(initial.map((e) => [e.date, { type: e.type, half: e.half }]))
  );
  const [activeType, setActiveType] = useState<LeaveType>("MC");

  const [y, m] = ym.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  // Monday-first grid, matching how the payroll weeks are anchored.
  const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;

  const isWorkingDay = (day: number) => {
    const w = new Date(y, m - 1, day).getDay();
    if (w === 0) return false; // Sunday — never a working day
    if (w === 6) return pattern >= 5.5; // Saturday — only on 5.5 or 6 day weeks
    return true;
  };

  const dateKey = (day: number) => `${ym}-${String(day).padStart(2, "0")}`;

  const cycle = (day: number) => {
    if (disabled || !isWorkingDay(day)) return;
    const key = dateKey(day);
    setMarks((prev) => {
      const next = new Map(prev);
      const cur = next.get(key);
      if (!cur || cur.type !== activeType) next.set(key, { type: activeType, half: false });
      else if (!cur.half) next.set(key, { type: activeType, half: true });
      else next.delete(key);
      return next;
    });
  };

  const serialised = Array.from(marks.entries())
    .map(([date, mk]) => `${date}:${mk.type}:${mk.half ? "1" : "0"}`)
    .join(",");

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="stack">
      <input type="hidden" name="leaveDays" value={serialised} />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="hint">Marking:</span>
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn sm ${activeType === t.key ? "pri" : ""}`}
            onClick={() => setActiveType(t.key)}
            disabled={disabled}
            aria-pressed={activeType === t.key}
          >
            {t.label}
          </button>
        ))}
        <span className="hint">Click a date to mark it · click again for a half day · again to clear</span>
      </div>

      <div className="cal">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="cal-head">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} className="cal-cell empty-cell" />;
          const key = dateKey(day);
          const mark = marks.get(key);
          const working = isWorkingDay(day);
          return (
            <button
              key={key}
              type="button"
              onClick={() => cycle(day)}
              disabled={disabled || !working}
              className={`cal-cell${working ? "" : " off"}${mark ? ` on ${mark.type}` : ""}`}
              title={working ? `${key}${mark ? ` — ${mark.half ? "half day " : ""}${mark.type}` : ""}` : `${key} — not a working day`}
            >
              <span className="cal-day">{day}</span>
              {mark && <span className="cal-tag">{TYPES.find((t) => t.key === mark.type)?.short}{mark.half ? "½" : ""}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
