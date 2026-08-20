"use client";

import { useActionState } from "react";

type Result = { error?: string };

export default function CreateUserForm({ action }: { action: (formData: FormData) => Promise<Result> }) {
  const [state, formAction, pending] = useActionState<Result, FormData>(async (_prev, formData) => action(formData), {});

  return (
    <form action={formAction}>
      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Create a new login</h3>
      <div className="flex items-center gap-2 flex-wrap">
        <input className="inp" name="name" placeholder="Name" required style={{ maxWidth: 160 }} />
        <input className="inp" type="email" name="email" placeholder="Email" required style={{ maxWidth: 220 }} />
        <input className="inp" type="password" name="password" placeholder="Password (min. 8 chars)" required style={{ maxWidth: 200 }} />
        <select className="inp" name="role" defaultValue="STAFF" style={{ maxWidth: 200 }}>
          <option value="STAFF">Staff — can only key in MC/leave</option>
          <option value="ADMIN">Administrator — full payroll access</option>
        </select>
        <button className="btn pri" type="submit" disabled={pending}>{pending ? "Creating…" : "Create login"}</button>
      </div>
      {state.error && <div className="note bad" style={{ marginTop: 10 }}>{state.error}</div>}
    </form>
  );
}
