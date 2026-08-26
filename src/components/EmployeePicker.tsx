"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Employee switcher for the timesheet / attendance screens. Replaces
 *  scrolling a long list of per-employee cards — pick a person and the
 *  page reloads showing only them. Prev/next buttons make working
 *  through everyone in order quick without reopening the dropdown. */
export default function EmployeePicker({
  employees,
  selectedId,
  basePath,
  ym,
}: {
  employees: { id: string; name: string }[];
  selectedId: string;
  basePath: string;
  ym: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!employees.length) return null;

  const index = employees.findIndex((e) => e.id === selectedId);
  const go = (id: string) => startTransition(() => router.push(`${basePath}?ym=${ym}&emp=${id}`));

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="f">
        <span>Employee</span>
        <div className="picker-group">
          <select className="inp" value={selectedId} disabled={isPending} onChange={(e) => go(e.target.value)} aria-label="Employee">
            {employees.map((e, i) => (
              <option key={e.id} value={e.id}>
                {i + 1}. {e.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            disabled={isPending || index <= 0}
            onClick={() => go(employees[index - 1].id)}
            aria-label="Previous employee"
          >
            ←
          </button>
          <button
            type="button"
            className="btn"
            disabled={isPending || index < 0 || index >= employees.length - 1}
            onClick={() => go(employees[index + 1].id)}
            aria-label="Next employee"
          >
            →
          </button>
        </div>
      </div>
      <span className="hint" style={{ paddingBottom: 10 }}>
        {index >= 0 ? `${index + 1} of ${employees.length}` : `${employees.length} on file`}
        {isPending ? " · loading…" : ""}
      </span>
    </div>
  );
}
