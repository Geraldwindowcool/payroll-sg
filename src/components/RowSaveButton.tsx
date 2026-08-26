"use client";

import { useTransition } from "react";

/** A save button for the "form associated by id" pattern (a <button
 *  form="some-id"> targeting a <form> rendered elsewhere in the DOM — used
 *  in Settings' user table, since forms can't legally nest inside
 *  <tr>/<tbody>). useFormStatus can't help here: it only sees a form that
 *  is an ANCESTOR of this button in the React tree, and this button isn't
 *  one. Instead this reads the actual form's fields and calls the server
 *  action directly inside a transition, the same pattern CompanySwitcher
 *  uses for its pending overlay — that's what makes `isPending` track the
 *  real duration of the save instead of just the synchronous click. */
export default function RowSaveButton({
  formId,
  action,
  className = "btn sm",
  pendingText = "Saving…",
  children,
}: {
  formId: string;
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  pendingText?: string;
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form || !form.reportValidity()) return;
    const formData = new FormData(form);
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={isPending} aria-busy={isPending}>
      {isPending && <span className="spinner" aria-hidden="true" />}
      {isPending ? pendingText : children}
    </button>
  );
}
