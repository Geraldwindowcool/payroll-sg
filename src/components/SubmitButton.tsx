"use client";

import { useFormStatus } from "react-dom";

/** A submit button that shows a spinner and disables itself while its
 *  form's Server Action is running. Must be rendered INSIDE the <form> it
 *  submits — useFormStatus only sees the nearest parent form, which is why
 *  this can't just be a prop on the existing plain <button>. Without this,
 *  clicking Save gives no feedback at all until the whole page re-renders
 *  once the action finishes, which reads as "did that even work?". */
export default function SubmitButton({
  children,
  pendingText,
  className = "btn pri",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending && <span className="spinner" aria-hidden="true" />}
      {pending ? pendingText ?? "Saving…" : children}
    </button>
  );
}
