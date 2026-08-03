import { createSupabaseBrowserClient } from "@lifeos/db/supabase/browser";

/**
 * Browser Supabase client for auth session handling only. Uses NEXT_PUBLIC_*
 * values, which are safe to expose to the browser.
 */
export function getSupabaseBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
