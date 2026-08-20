import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "ADMIN" | "STAFF";
    };
  }
  interface User {
    role?: "ADMIN" | "STAFF";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || !user.active) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      const t = token as typeof token & { id?: string; role?: "ADMIN" | "STAFF" };
      if (user) {
        t.id = user.id;
        t.role = (user as { role?: "ADMIN" | "STAFF" }).role;
      }
      return t;
    },
    session: async ({ session, token }) => {
      const t = token as typeof token & { id?: string; role?: "ADMIN" | "STAFF" };
      if (session.user) {
        session.user.id = t.id as string;
        session.user.role = t.role as "ADMIN" | "STAFF";
      }
      return session;
    },
  },
});
