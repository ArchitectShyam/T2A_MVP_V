import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * `tasks` table. Column names are snake_case in Postgres; Drizzle exposes
 * camelCase keys. Repositories map rows to the `Task` domain type from
 * `@lifeos/contracts` so Drizzle types never leak upward.
 *
 * RLS is enabled on this table (see the accompanying migration). Policies use
 * the `(select auth.uid()) = user_id` form as defense-in-depth; the service
 * layer is the primary authorization boundary.
 */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    notes: text("notes"),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tasks_user_id_created_at_idx").on(t.userId, t.createdAt.desc())],
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
