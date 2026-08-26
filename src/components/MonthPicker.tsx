"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Month switcher for the timesheet / attendance / leave screens — changes
 *  navigate immediately, same as EmployeePicker's dropdown, instead of
 *  needing a separate "Go" click. The two pickers sit right next to each
 *  other on the page and do conceptually the same job (show me a
 *  different slice of the same data), so they should behave the same way. */
export default function MonthPicker({
  ym,
  employeeId,
  basePath,
}: {
  ym: string;
  employeeId: string;
  basePath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const go = (newYm: string) => {
    if (!newYm) return;
    startTransition(() => router.push(`${basePath}?ym=${newYm}&emp=${employeeId}`));
  };

  return (
    <label className="f" style={{ maxWidth: 170 }}>
      <span>Month{isPending ? " · loading…" : ""}</span>
      <input className="inp" type="month" defaultValue={ym} disabled={isPending} onChange={(e) => go(e.target.value)} />
    </label>
  );
}
