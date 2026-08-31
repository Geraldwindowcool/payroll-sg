"use client";

import { useRef, useState, useTransition } from "react";
import { uploadMcAttachmentAction, deleteMcAttachmentAction } from "@/app/actions/mcAttachments";
import { formatFileSize } from "@/lib/mcAttachments";
import type { McAttachmentMeta } from "@/db/schema";

/** Attach a photo or PDF of an employee's actual MC slip to the month
 *  they're already marking it on the calendar above. Uploads the instant
 *  a file is chosen — no separate "Upload" button, matching the
 *  calendar's own auto-save so this reads as one continuous action
 *  ("mark the day, attach the proof") rather than a second errand. */
export default function McAttachments({
  companyId,
  employeeId,
  ym,
  initial,
}: {
  companyId: string;
  employeeId: string;
  ym: string;
  initial: McAttachmentMeta[];
}) {
  const [isUploading, startUpload] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("companyId", companyId);
    fd.set("employeeId", employeeId);
    fd.set("ym", ym);
    fd.set("file", file);
    startUpload(async () => {
      const result = await uploadMcAttachmentAction(fd);
      if (!result.ok) setError(result.error ?? "Upload failed — try again.");
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const handleDelete = (id: string) => {
    setError(null);
    setDeletingId(id);
    const fd = new FormData();
    fd.set("id", id);
    startDelete(async () => {
      const result = await deleteMcAttachmentAction(fd);
      if (!result.ok) setError(result.error ?? "Couldn't delete — try again.");
      setDeletingId(null);
    });
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="hint">MC documents:</span>
        <label className="btn sm" style={{ cursor: isUploading ? "default" : "pointer", opacity: isUploading ? 0.7 : 1 }}>
          {isUploading ? (
            <>
              <span className="spinner" aria-hidden="true" /> Uploading…
            </>
          ) : (
            "+ Attach MC photo or PDF"
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf"
            capture="environment"
            onChange={handleFileChange}
            disabled={isUploading}
            style={{ display: "none" }}
          />
        </label>
        <span className="hint">Photos or PDFs, up to 5MB.</span>
      </div>

      {error && (
        <div className="note bad" style={{ fontSize: 13, padding: "8px 12px" }}>
          {error}
        </div>
      )}

      {initial.length > 0 && (
        <ul className="stack" style={{ gap: 6, listStyle: "none", padding: 0, margin: 0 }}>
          {initial.map((a) => (
            <li key={a.id} className="flex items-center gap-3 flex-wrap" style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
              <a href={`/api/mc-attachments/${a.id}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-ink)" }}>
                📎 {a.fileName}
              </a>
              <span className="hint">
                {formatFileSize(a.fileSize)} · {new Date(a.createdAt).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
              </span>
              <button
                type="button"
                className="btn sm danger"
                onClick={() => handleDelete(a.id)}
                disabled={isDeleting && deletingId === a.id}
                style={{ marginLeft: "auto" }}
              >
                {isDeleting && deletingId === a.id ? "Deleting…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
