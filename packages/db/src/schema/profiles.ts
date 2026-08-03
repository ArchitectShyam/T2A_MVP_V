import { sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Subscription tiers. New users start on `free`.
 */
export const planEnum = pgEnum("plan", ["free", "pro", "premium"]);

/**
 * `profiles` extends Supabase's `auth.users` 1:1. A row is created
 * automatically by the `handle_new_user` trigger on sign-up (see the
 * accompanying migration), defaulting to the `free` plan with a 3-month trial.
 *
 * RLS: users may read their own profile. Plan/trial columns are never writable
 * from the client — those are changed server-side with the service role.
 */
export const profiles = pgTable("profiles", {
  // Matches auth.users.id. The FK (on delete cascade) is added in the migration
  // since Drizzle does not model the `auth` schema.
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  plan: planEnum("plan").notNull().default("free"),
  planStartedAt: timestamp("plan_started_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  // Free-trial expiry: 3 months from creation. Recorded now; enforcement later.
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now() + interval '3 months'`),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
