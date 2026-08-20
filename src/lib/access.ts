import "server-only";
import { auth } from "@/lib/auth";

export class AccessError extends Error {}

/** Any signed-in user (ADMIN or STAFF). Throws if not logged in. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new AccessError("Not signed in.");
  return session.user;
}

/** ADMIN only — full payroll access. Throws otherwise. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AccessError("Administrator access required.");
  return user;
}
