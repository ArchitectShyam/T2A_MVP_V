import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Used ONLY for auth session handling on the
 * client, storage signed URLs, and realtime channels — never for data access
 * (that goes through the API/core/db path).
 */
export function createSupabaseBrowserClient(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
