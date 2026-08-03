// Data layer public surface.
export { createDbClient } from "./client.js";
export type { Database } from "./client.js";

export * as schema from "./schema/index.js";
export type { TaskRow, NewTaskRow } from "./schema/tasks.js";

export { DrizzleTaskRepository } from "./repositories/task-repository.js";

export { createSupabaseBrowserClient } from "./supabase/browser.js";
export { createSupabaseServerClient } from "./supabase/server.js";
export type { CookieAdapter } from "./supabase/server.js";
export { createSupabaseAdminClient } from "./supabase/admin.js";
