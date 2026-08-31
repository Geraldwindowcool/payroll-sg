import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mcAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, allowedEmployeeIds } from "@/lib/access";

/** Serves one MC attachment's actual file bytes — kept as its own route
 *  rather than embedding the file in the page, so the (potentially
 *  several-MB) bytes are only ever fetched when someone actually opens
 *  the file, not on every page load that lists it. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [att] = await db.select().from(mcAttachments).where(eq(mcAttachments.id, id)).limit(1);
  if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await allowedEmployeeIds();
  if (allowed && !allowed.has(att.employeeId)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  return new NextResponse(new Uint8Array(att.fileData), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": `inline; filename="${att.fileName.replace(/[^\w.\- ]+/g, "_")}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
