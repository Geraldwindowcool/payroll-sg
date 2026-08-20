import { requireAdmin } from "@/lib/access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // defense in depth — proxy.ts already gates /admin, this gates server actions too
  return children;
}
