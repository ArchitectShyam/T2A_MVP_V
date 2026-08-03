import { createServerClient } from "@supabase/ssr";

/**
 * A framework-agnostic cookie adapter. The web app supplies an implementation
 * backed by Next.js `cookies()`; this keeps `@lifeos/db` free of any Next.js
 * import.
 */
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(
    cookies: { name: string; value: string; options?: Record<string, unknown> }[],
  ): void;
}

/**
 * Server-side Supabase client bound to the request's cookies. Used for auth
 * session verification/refresh and privileged-but-user-scoped operations.
 */
export function createSupabaseServerClient(
  url: string,
  anonKey: string,
  cookies: CookieAdapter,
) {
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet: Parameters<CookieAdapter["setAll"]>[0]) =>
        cookies.setAll(toSet),
    },
  });
}
