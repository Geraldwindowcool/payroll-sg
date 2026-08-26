"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { LeaveDayEntry, LeaveType } from "@/lib/leave";
import { autoSaveLeaveDaysAction } from "@/app/actions/leaveDays";

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
 *  Every click saves itself right away (see autoSaveLeaveDaysAction) —
 *  no separate Save button for this part, and a plain "Saved" message
 *  confirms it, so nobody has to wonder whether a tap actually took or
 *  scroll down to find a button to be sure.
 *
 *  Non-working days (Sundays always, Saturdays on a 5-day week) are shown
 *  greyed and can't be marked — marking them would be recorded as zero
 *  days anyway, so letting people click them would only be misleading.
 *
 *  State is ALSO posted as one hidden field, `leaveDays`, holding
 *  "YYYY-MM-DD:TYPE:half" entries, in case this calendar sits inside a
 *  bigger form (Attendance/Timesheet) — that form's own Save re-saves the
 *  same dates as a harmless safety net, it just doesn't have to. */
export default function LeaveCalendar({
  ym,
  pattern,
  initial,
  companyId,
  employeeId,
  disabled = false,
}: {
  ym: string;
  pattern: number;
  initial: LeaveDayEntry[];
  companyId: string;
  employeeId: string;
  disabled?: boolean;
}) {
  const [marks, setMarks] = useState<Map<string, Marked>>(
    () => new Map(initial.map((e) => [e.date, { type: e.type, half: e.half }]))
  );
  const [activeType, setActiveType] = useState<LeaveType>("MC");
  const [isSaving, startSaving] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync local marks whenever the server sends a different initial set —
  // e.g. after switching employee/month, or after the auto-save above
  // triggers a fresh server render.
  useEffect(() => {
    setMarks(new Map(initial.map((e) => [e.date, { type: e.type, half: e.half }])));
  }, [initial]);

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

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
    if (disabled || isSaving || !isWorkingDay(day)) return;
    const key = dateKey(day);
    const next = new Map(marks);
    const cur = next.get(key);
    if (!cur || cur.type !== activeType) next.set(key, { type: activeType, half: false });
    else if (!cur.half) next.set(key, { type: activeType, half: true });
    else next.delete(key);
    setMarks(next);

    const entries: LeaveDayEntry[] = Array.from(next.entries()).map(([date, mk]) => ({ date, type: mk.type, half: mk.half }));
    setJustSaved(false);
    startSaving(async () => {
      const result = await autoSaveLeaveDaysAction(companyId, employeeId, ym, entries);
      if (result.ok) {
        setJustSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setJustSaved(false), 3000);
      }
    });
  };

  const serialised = Array.from(marks.entries())
    .map(([date, mk]) => `${date}:${mk.type}:${mk.half ? "1" : "0"}`)
    .join(",");

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <div className="stack">
      <input type="hidden" name="leaveDays" value={serialised} />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="hint">Marking:</span>
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn sm leave-type-btn${activeType === t.key ? ` active ${t.key}` : ""}`}
            onClick={() => setActiveType(t.key)}
            disabled={disabled}
            aria-pressed={activeType === t.key}
          >
            <span className={`swatch ${t.key}`} aria-hidden="true" />
            {t.label}
          </button>
        ))}
        <span className={`save-status${!isSaving && justSaved ? " saved" : ""}`} aria-live="polite">
          {isSaving && (
            <>
              <span className="spinner" aria-hidden="true" /> Saving…
            </>
          )}
          {!isSaving && justSaved && <>✓ Saved</>}
        </span>
      </div>

      <div className="note info">
        <strong>How to mark a day:</strong> Tap the date once for a full day. Tap it a second time for a half day. Tap it a third time to remove it.
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
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => cycle(day)}
              disabled={disabled || !working}
              className={`cal-cell${working ? "" : " off"}${mark ? ` on ${mark.type}` : ""}${isToday ? " today" : ""}`}
              title={`${key}${!working ? " — not a working day" : mark ? ` — ${mark.half ? "half day " : ""}${mark.type}` : ""}${isToday ? " (today)" : ""}`}
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
