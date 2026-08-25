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
    <div className="flex items-end gap-2 flex-wrap">
      <label className="f" style={{ minWidth: 230 }}>
        <span>Employee</span>
        <select className="inp" value={selectedId} disabled={isPending} onChange={(e) => go(e.target.value)} aria-label="Employee">
          {employees.map((e, i) => (
            <option key={e.id} value={e.id}>
              {i + 1}. {e.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-1" style={{ paddingBottom: 1 }}>
        <button
          type="button"
          className="btn sm"
          disabled={isPending || index <= 0}
          onClick={() => go(employees[index - 1].id)}
          aria-label="Previous employee"
        >
          ←
        </button>
        <button
          type="button"
          className="btn sm"
          disabled={isPending || index < 0 || index >= employees.length - 1}
          onClick={() => go(employees[index + 1].id)}
          aria-label="Next employee"
        >
          →
        </button>
        <span className="hint" style={{ marginLeft: 6 }}>
          {index >= 0 ? `${index + 1} of ${employees.length}` : `${employees.length} on file`}
          {isPending ? " · loading…" : ""}
        </span>
      </div>
    </div>
  );
}
