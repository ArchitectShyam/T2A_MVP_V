import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit config. Migrations are generated from the schema and committed
 * under ./migrations. The DATABASE_URL must point at the Supabase Supavisor
 * transaction pooler (port 6543) — see .env.example.
 */
export default defineConfig({
  // Point at the concrete table modules rather than the `index.ts` barrel:
  // drizzle-kit's loader does not honour the ESM ".js" specifier used by the
  // barrel's re-exports. Add new table files here as the schema grows.
  schema: ["./src/schema/tasks.ts"],
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
