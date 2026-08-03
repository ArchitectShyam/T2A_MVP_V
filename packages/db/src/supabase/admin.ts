import { createClient } from "@supabase/supabase-js";

/**
 * Admin client using the service-role key. SERVER-ONLY. Bypasses RLS, so it
 * must never be constructed with a value exposed to the browser and must never
 * be used to serve unauthenticated requests.
 */
export function createSupabaseAdminClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
