"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
