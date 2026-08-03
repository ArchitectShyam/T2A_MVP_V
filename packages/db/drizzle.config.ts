import { defineConfig } from "drizzle-kit";
import path from "node:path";

// drizzle-kit does not auto-load .env, so load it ourselves. Migrations use the
// repo-root .env (DIRECT_URL preferred — see below). `process.loadEnvFile` is
// Node >= 20.12; access it defensively so typecheck never depends on it.
const loadEnvFile = (
  process as unknown as { loadEnvFile?: (p: string) => void }
).loadEnvFile;
if (loadEnvFile) {
  for (const p of [
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), ".env"),
  ]) {
    try {
      loadEnvFile(p);
    } catch {
      // File may not exist — that's fine.
    }
  }
}

/**
 * drizzle-kit config. Migrations run against a *direct* (session) connection —
 * `DIRECT_URL` (Supabase port 5432) — because DDL over the transaction pooler
 * (port 6543) is unreliable. The app runtime still uses the pooler via
 * `DATABASE_URL`. Falls back to `DATABASE_URL` when `DIRECT_URL` is unset.
 */
export default defineConfig({
  // Point at the concrete table modules rather than the `index.ts` barrel:
  // drizzle-kit's loader does not honour the ESM ".js" specifier used by the
  // barrel's re-exports. Add new table files here as the schema grows.
  schema: ["./src/schema/profiles.ts", "./src/schema/tasks.ts"],
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
