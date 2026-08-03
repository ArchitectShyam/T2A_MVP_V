import { createApiClient } from "@lifeos/api/client";

function resolveBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * The typed Hono RPC client. Components/hooks talk to the backend exclusively
 * through this — no direct data access anywhere in the UI. `credentials:
 * include` ensures the Supabase auth cookies ride along.
 */
export const apiClient = createApiClient(resolveBaseUrl(), {
  init: { credentials: "include" },
});
