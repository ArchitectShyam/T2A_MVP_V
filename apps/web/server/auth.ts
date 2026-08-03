import { createSupabaseServerClient } from "@lifeos/db/supabase/server";
import { cookies } from "next/headers";
import { getServerEnv } from "./env.js";

/**
 * Reads the current authenticated user from the request cookies, for use in
 * Server Components (e.g. route guards). Lives in `web-infra` because it wires
 * the Supabase server client.
 */
export async function getCurrentUser() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: () => {},
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
