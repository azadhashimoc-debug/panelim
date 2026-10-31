import "server-only";
import { userClient } from "@/infrastructure/supabase/server";
export async function requireSession() {
  const client = await userClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("UNAUTHENTICATED");
  return { client, user: data.user };
}
