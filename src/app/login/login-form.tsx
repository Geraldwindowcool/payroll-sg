"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginForm({ from }: { from?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="from" value={from || "/"} />
      <label className="f">
        <span>Email</span>
        <input className="inp" type="email" name="email" required autoFocus autoComplete="username" />
      </label>
      <label className="f">
        <span>Password</span>
        <input className="inp" type="password" name="password" required autoComplete="current-password" />
      </label>
      {state?.error && (
        <div className="note bad" style={{ marginBottom: 12 }}>
          {state.error}
        </div>
      )}
      <button className="btn pri" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
