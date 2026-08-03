import { createApp, type AppDeps } from "@lifeos/api";
import {
  createDbClient,
  createSupabaseServerClient,
  DrizzleTaskRepository,
  type CookieAdapter,
} from "@lifeos/db";
import type { Context } from "hono";
import { getServerEnv } from "./env.js";

/**
 * Composition root.
 *
 * This is the ONE place that wires concrete infrastructure (Drizzle + Supabase)
 * into the transport layer. `DrizzleTaskRepository` is a structural match for
 * the `TaskRepository` port defined in `@lifeos/core`; the `satisfies AppDeps`
 * check below is where dependency inversion is verified at compile time.
 */

function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  return header
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return { name: pair, value: "" };
      return {
        name: pair.slice(0, eq).trim(),
        value: decodeURIComponent(pair.slice(eq + 1).trim()),
      };
    });
}

function buildRepos() {
  const env = getServerEnv();
  const db = createDbClient(env.DATABASE_URL);
  return { tasks: new DrizzleTaskRepository(db) };
}

/** Resolve the authenticated user id from the request cookies via Supabase. */
async function authenticate(c: Context): Promise<string | null> {
  const env = getServerEnv();
  const cookies = parseCookieHeader(c.req.header("cookie") ?? null);
  const adapter: CookieAdapter = {
    getAll: () => cookies,
    // Read-only during request handling; session refresh happens in middleware.
    setAll: () => {},
  };
  const supabase = createSupabaseServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    adapter,
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

let cachedApp: ReturnType<typeof createApp> | null = null;

/** Lazily build the Hono app so `next build` succeeds without a live database. */
export function getApp() {
  if (!cachedApp) {
    cachedApp = createApp({ repos: buildRepos(), authenticate } satisfies AppDeps);
  }
  return cachedApp;
}
