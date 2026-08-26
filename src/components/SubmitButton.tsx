"use client";

import { useFormStatus } from "react-dom";

/** A submit button that shows a spinner and disables itself while its
 *  form's Server Action is running. Must be rendered INSIDE the <form> it
 *  submits — useFormStatus only sees the nearest parent form, which is why
 *  this can't just be a prop on the existing plain <button>. Without this,
 *  clicking Save gives no feedback at all until the whole page re-renders
 *  once the action finishes, which reads as "did that even work?".
 *
 *  A few forms have two submit buttons targeting different actions (e.g.
 *  Save + Delete on the same row) via the `formAction` prop below. Every
 *  submit button in a form shares one `pending` flag, so without more care
 *  clicking Delete would make the Save button next to it say "Saving…" too
 *  — `action` lets each button check `useFormStatus().action` (which
 *  server action actually triggered this submission) and only show its
 *  own spinner/label when it's the one that got clicked. Omit `action`
 *  for an ordinary single-button form, where there's no ambiguity. */
export default function SubmitButton({
  children,
  pendingText,
  className = "btn pri",
  action,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const status = useFormStatus();
  const isThisPending = status.pending && (action === undefined || status.action === action);
  return (
    <button className={className} type="submit" formAction={action} disabled={status.pending} aria-busy={isThisPending}>
      {isThisPending && <span className="spinner" aria-hidden="true" />}
      {isThisPending ? pendingText ?? "Saving…" : children}
    </button>
  );
}
