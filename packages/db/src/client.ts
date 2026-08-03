import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

/**
 * Creates a Drizzle client backed by postgres-js.
 *
 * `prepare: false` is REQUIRED when connecting through the Supabase Supavisor
 * transaction pooler (port 6543): in transaction pooling mode connections are
 * not sticky, so server-side prepared statements are unsupported.
 */
export function createDbClient(connectionString: string) {
  const sql = postgres(connectionString, { prepare: false });
  return drizzle(sql, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDbClient>;
