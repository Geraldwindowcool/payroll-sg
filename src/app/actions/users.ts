"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, employees, employeeAccess } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/access";
import { hashPassword } from "@/lib/password";

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

/** ADMIN only — this is how the administrator sets up their colleague's
 *  staff (or a second admin's) login. No self-signup exists in this app. */
export async function createUserAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const email = s(formData, "email").toLowerCase();
  const name = s(formData, "name");
  const password = s(formData, "password");
  const role = (s(formData, "role") || "STAFF") as "ADMIN" | "STAFF";
  if (!email || !name || !password) return { error: "Name, email and password are all required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return { error: "A user with that email already exists." };

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ email, name, passwordHash, role });
  revalidatePath("/admin/settings");
  return {};
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = s(formData, "id");
  if (!id) return;
  const name = s(formData, "name");
  const role = (s(formData, "role") || "STAFF") as "ADMIN" | "STAFF";
  const active = formData.get("active") === "on";

  // Guard against locking everyone out: don't let the last active admin
  // demote or deactivate themselves.
  if (id === admin.id && (role !== "ADMIN" || !active)) {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN"));
    if (admins.length <= 1) return;
  }

  const patch: Partial<typeof users.$inferInsert> = { name, role, active, updatedAt: new Date() };
  const newPassword = s(formData, "password");
  if (newPassword) {
    if (newPassword.length < 8) return;
    patch.passwordHash = await hashPassword(newPassword);
  }
  await db.update(users).set(patch).where(eq(users.id, id));
  revalidatePath("/admin/settings");
}

/** Sets which of the active company's employees a Staff login can see on
 *  the Attendance and MC/leave screens. Scoped to one company per call —
 *  only touches this company's employee rows, so assignments made for a
 *  user under a different company (via the company switcher) are left
 *  alone. Leaving every box unchecked clears this company's assignments
 *  for that user; if they have no assignments left anywhere, they go back
 *  to seeing everyone (see allowedEmployeeIds()). */
export async function setUserEmployeeAccessAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const companyId = String(formData.get("companyId") || "");
  if (!userId || !companyId) return;

  const checkedIds = formData.getAll("employeeIds").map(String);
  const companyEmployees = await db.select({ id: employees.id }).from(employees).where(eq(employees.companyId, companyId));
  const companyEmployeeIds = companyEmployees.map((e) => e.id);
  if (!companyEmployeeIds.length) return;

  // Replace this company's slice of the assignment: clear it, then re-add
  // whatever's checked — never touches rows for other companies.
  await db.delete(employeeAccess).where(and(eq(employeeAccess.userId, userId), inArray(employeeAccess.employeeId, companyEmployeeIds)));
  const toAdd = checkedIds.filter((id) => companyEmployeeIds.includes(id));
  if (toAdd.length) {
    await db.insert(employeeAccess).values(toAdd.map((employeeId) => ({ userId, employeeId })));
  }
  revalidatePath("/admin/settings");
  revalidatePath("/leave");
  revalidatePath("/attendance");
}
