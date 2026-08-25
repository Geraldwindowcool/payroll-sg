"use client";

import { useState, useTransition } from "react";
import { switchCompanyAction } from "@/app/actions/company";

export default function CompanySwitcher({ companies, activeId }: { companies: { id: string; name: string }[]; activeId?: string }) {
  const [isPending, startTransition] = useTransition();
  const [pendingName, setPendingName] = useState<string | null>(null);

  if (!companies.length) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === activeId) return;
    setPendingName(companies.find((c) => c.id === id)?.name ?? "that company");
    const formData = new FormData();
    formData.set("companyId", id);
    // Switching companies re-renders every page under this layout with the
    // new company's data, which takes a moment — without this overlay the
    // screen would just sit there with no sign anything happened.
    startTransition(() => {
      switchCompanyAction(formData);
    });
  };

  return (
    <>
      <select
        className="inp"
        name="companyId"
        defaultValue={activeId}
        onChange={handleChange}
        disabled={isPending}
        style={{ width: "auto", maxWidth: 240 }}
        aria-label="Active company"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {isPending && (
        <div className="company-switch-overlay" role="status" aria-live="polite">
          <div className="company-switch-card">
            <span className="spinner" aria-hidden="true" />
            <span>Switching to {pendingName}…</span>
          </div>
        </div>
      )}
    </>
  );
}
