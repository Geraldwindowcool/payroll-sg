"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const from = String(formData.get("from") || "/");

  try {
    await signIn("credentials", { email, password, redirectTo: from === "" ? "/" : from });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "That email or password isn't right." };
    }
    // NEXT_REDIRECT is thrown by signIn() on success — let it propagate.
    throw err;
  }
}
