import "server-only";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function getUsers() {
  return db.select().from(users).orderBy(users.createdAt);
}
