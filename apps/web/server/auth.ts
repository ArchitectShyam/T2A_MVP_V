import { createSupabaseServerClient } from "@lifeos/db/supabase/server";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env.js";

/**
 * Reads the current authenticated user from the request cookies, for use in
 * Server Components (e.g. route guards). Lives in `web-infra` because it wires
 * the Supabase server client. Returns `null` when Supabase is not configured.
 */
export async function getCurrentUser() {
  const env = getSupabaseEnv();
  if (!env) return null;
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(
      env.url,
      env.anonKey,
      {
        getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: () => {},
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    // Misconfigured or unreachable Supabase — treat as signed out.
    return null;
  }
}
