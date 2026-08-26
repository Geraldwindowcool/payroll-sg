"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Month switcher for the timesheet / attendance / leave / budget screens —
 *  changes navigate immediately, same as EmployeePicker's dropdown, instead
 *  of needing a separate "Go" click. The two pickers sit right next to each
 *  other on the page and do conceptually the same job (show me a
 *  different slice of the same data), so they should behave the same way.
 *
 *  `extraParams` carries whatever else the page's URL needs alongside `ym`
 *  (e.g. `{ emp: selected.id }` for the employee-scoped pages) — the budget
 *  entries page has no employee concept, so it simply passes none. */
export default function MonthPicker({
  ym,
  extraParams,
  basePath,
}: {
  ym: string;
  extraParams?: Record<string, string>;
  basePath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const go = (newYm: string) => {
    if (!newYm) return;
    const params = new URLSearchParams({ ym: newYm, ...extraParams });
    startTransition(() => router.push(`${basePath}?${params.toString()}`));
  };

  return (
    <label className="f" style={{ maxWidth: 170 }}>
      <span>Month{isPending ? " · loading…" : ""}</span>
      <input className="inp" type="month" defaultValue={ym} disabled={isPending} onChange={(e) => go(e.target.value)} />
    </label>
  );
}
