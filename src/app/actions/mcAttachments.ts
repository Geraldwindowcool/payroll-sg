"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { mcAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, allowedEmployeeIds } from "@/lib/access";
import { validateMcFile } from "@/lib/mcAttachments";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

/** Uploads one MC photo/PDF for an employee's month. Any signed-in user
 *  can use this — a Staff login is scoped to whichever employees it's
 *  allowed to see (same rule as the leave calendar itself), so a
 *  colleague marking their own MC can attach the slip right there too. */
export async function uploadMcAttachmentAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const companyId = s(formData, "companyId");
  const employeeId = s(formData, "employeeId");
  const ym = s(formData, "ym");
  const file = formData.get("file");

  if (!companyId || !employeeId || !ym || !(file instanceof File)) {
    return { ok: false, error: "Missing file or details." };
  }

  const allowed = await allowedEmployeeIds();
  if (allowed && !allowed.has(employeeId)) return { ok: false, error: "You don't have access to this employee." };

  const validationError = validateMcFile(file);
  if (validationError) return { ok: false, error: validationError };

  const buf = Buffer.from(await file.arrayBuffer());
  await db.insert(mcAttachments).values({
    companyId,
    employeeId,
    ym,
    fileName: file.name || "MC document",
    mimeType: file.type,
    fileSize: file.size,
    fileData: buf,
    uploadedByUserId: user.id,
  });

  revalidatePath("/leave");
  revalidatePath("/attendance");
  return { ok: true };
}

export async function deleteMcAttachmentAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const id = s(formData, "id");
  if (!id) return { ok: false, error: "Missing id." };

  const [att] = await db.select({ employeeId: mcAttachments.employeeId }).from(mcAttachments).where(eq(mcAttachments.id, id)).limit(1);
  if (!att) return { ok: true }; // already gone

  const allowed = await allowedEmployeeIds();
  if (allowed && !allowed.has(att.employeeId)) return { ok: false, error: "You don't have access to this employee." };

  await db.delete(mcAttachments).where(eq(mcAttachments.id, id));
  revalidatePath("/leave");
  revalidatePath("/attendance");
  return { ok: true };
}
