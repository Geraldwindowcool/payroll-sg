import "server-only";
import { db } from "@/db";
import { mcAttachments, type McAttachmentMeta } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

/** Metadata only — never the file bytes themselves — for listing what's
 *  attached to an employee's month. The actual file is served on demand
 *  by the download route, one attachment at a time. */
export async function getMcAttachments(employeeId: string, ym: string): Promise<McAttachmentMeta[]> {
  return db
    .select({
      id: mcAttachments.id,
      companyId: mcAttachments.companyId,
      employeeId: mcAttachments.employeeId,
      ym: mcAttachments.ym,
      fileName: mcAttachments.fileName,
      mimeType: mcAttachments.mimeType,
      fileSize: mcAttachments.fileSize,
      uploadedByUserId: mcAttachments.uploadedByUserId,
      createdAt: mcAttachments.createdAt,
    })
    .from(mcAttachments)
    .where(and(eq(mcAttachments.employeeId, employeeId), eq(mcAttachments.ym, ym)))
    .orderBy(desc(mcAttachments.createdAt));
}
