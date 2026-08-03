import type { Repositories } from "@lifeos/core";
import type { Context } from "hono";

/**
 * Dependencies injected into the Hono app at the composition root
 * (`apps/web/server`). This is how the transport layer stays free of any
 * concrete data-layer or Supabase import: the composition root supplies the
 * repositories and an `authenticate` function that resolves the user from the
 * verified session.
 */
export interface AppDeps {
  /** Concrete repositories (e.g. Drizzle-backed) satisfying the core ports. */
  repos: Repositories;
  /**
   * Resolves the authenticated user id from the request, or null if there is
   * no valid session. Implemented by the composition root using Supabase.
   */
  authenticate: (c: Context) => Promise<string | null>;
}

/** Hono context variables set by the auth middleware. */
export interface AppVariables {
  userId: string;
}
