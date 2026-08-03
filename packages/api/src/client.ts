import { hc } from "hono/client";
import type { AppType } from "./app.js";

/**
 * Factory for the typed Hono RPC client used by the web app. The generic
 * `AppType` gives full end-to-end type-safety on request/response shapes.
 */
export function createApiClient(
  baseUrl: string,
  options?: Parameters<typeof hc<AppType>>[1],
) {
  return hc<AppType>(baseUrl, options);
}

export type ApiClient = ReturnType<typeof createApiClient>;
