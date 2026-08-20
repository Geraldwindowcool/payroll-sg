"use client";

import { switchCompanyAction } from "@/app/actions/company";

export default function CompanySwitcher({ companies, activeId }: { companies: { id: string; name: string }[]; activeId?: string }) {
  if (!companies.length) return null;
  return (
    <form action={switchCompanyAction} className="flex items-center gap-2">
      <select
        className="inp"
        name="companyId"
        defaultValue={activeId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        style={{ width: "auto", maxWidth: 240 }}
        aria-label="Active company"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </form>
  );
}
