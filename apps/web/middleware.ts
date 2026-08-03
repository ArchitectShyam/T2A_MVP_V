import { createSupabaseServerClient } from "@lifeos/db/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and writes any rotated
 * cookies back onto the response, so Server Components and the API see a valid
 * session. (See the Supabase SSR middleware pattern.)
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured (e.g. a fresh local checkout) there is no
  // session to refresh — skip rather than crashing every request.
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createSupabaseServerClient(
    url,
    anonKey,
    {
      getAll: () =>
        request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(
            name,
            value,
            options as Parameters<typeof response.cookies.set>[2],
          );
        }
      },
    },
  );

  // IMPORTANT: getUser() triggers token refresh + cookie rotation.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and the service worker.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.png$).*)",
  ],
};
