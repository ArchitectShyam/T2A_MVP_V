import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Navigate feature schema — the daily-execution "Wheel of action" surface.
 * Mirrors packages/db/manual/navigate.sql (applied by hand in the Supabase SQL
 * Editor because this network blocks outbound Postgres). Column names are
 * snake_case in Postgres; Drizzle exposes camelCase. Runtime access goes
 * through the Supabase REST client with RLS — these definitions exist for
 * type-safety and migration parity, not runtime queries.
 */

// --- Enums -----------------------------------------------------------------
export const practiceTypeEnum = pgEnum("practice_type", [
  "habit",
  "routine",
  "ritual",
]);
export const polarityEnum = pgEnum("practice_polarity", ["good", "bad"]);
export const scheduleEnum = pgEnum("practice_schedule", [
  "daily",
  "weekdays",
  "weekly",
  "custom",
]);
export const reflectionTypeEnum = pgEnum("reflection_type", [
  "daily",
  "deep",
  "guided",
  "self_initiated",
]);
export const nudgeResponseEnum = pgEnum("nudge_response", ["up", "neutral", "down"]);
export const identityElementTypeEnum = pgEnum("identity_element_type", [
  "value",
  "belief",
  "strength",
  "role",
  "interest",
  "aspiration",
]);

// --- Practices (habits / routines / rituals) -------------------------------
export const practices = pgTable(
  "practices",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    practiceType: practiceTypeEnum("practice_type").notNull(),
    title: text("title").notNull(),
    polarity: polarityEnum("polarity").notNull().default("good"),
    schedule: scheduleEnum("schedule").notNull().default("daily"),
    scheduleDetail: jsonb("schedule_detail"),
    timeOfDay: text("time_of_day"),
    domainId: uuid("domain_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [index("practices_user_type_idx").on(t.userId, t.practiceType)],
);

// --- Practice steps (routine steps) ----------------------------------------
export const practiceSteps = pgTable(
  "practice_steps",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    practiceId: uuid("practice_id").notNull(),
    title: text("title").notNull(),
    sequence: integer("sequence").notNull().default(1),
    isOptional: boolean("is_optional").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("practice_steps_practice_idx").on(t.practiceId, t.sequence)],
);

// --- Ritual details (a practice elevated to ritual status) -----------------
export const ritualDetails = pgTable(
  "ritual_details",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    practiceId: uuid("practice_id").notNull(),
    intention: text("intention"),
    markedRitualAt: timestamp("marked_ritual_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ritual_details_user_idx").on(t.userId, t.practiceId)],
);

// --- Ritual identity links (link Discover elements to a ritual) ------------
export const ritualIdentityLinks = pgTable(
  "ritual_identity_links",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    ritualPracticeId: uuid("ritual_practice_id").notNull(),
    elementType: identityElementTypeEnum("element_type").notNull(),
    elementId: uuid("element_id").notNull(),
    elementLabel: text("element_label").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ritual_identity_links_practice_idx").on(t.ritualPracticeId)],
);

// --- Reflections -----------------------------------------------------------
export const reflections = pgTable(
  "reflections",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    reflectionType: reflectionTypeEnum("reflection_type").notNull().default("daily"),
    depthTrigger: text("depth_trigger"),
    prompt: text("prompt"),
    body: text("body").notNull(),
    entryDate: date("entry_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("reflections_user_date_idx").on(t.userId, t.entryDate)],
);

// --- Nudges (read-only content; user records a response) -------------------
export const nudges = pgTable(
  "nudges",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    kind: text("kind").notNull().default("insight"),
    domainId: uuid("domain_id"),
    nudgeDate: date("nudge_date").notNull(),
    response: nudgeResponseEnum("response"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("nudges_user_date_idx").on(t.userId, t.nudgeDate)],
);

// --- Daily logs (one per user per day) -------------------------------------
export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    logDate: date("log_date").notNull(),
    committedAt: timestamp("committed_at", { withTimezone: true, mode: "date" }),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true, mode: "date" }),
    checkoutSummary: text("checkout_summary"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("daily_logs_user_date_idx").on(t.userId, t.logDate)],
);

// --- Daily focus activities (today's plan) ---------------------------------
export const dailyFocusActivities = pgTable(
  "daily_focus_activities",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    dailyLogId: uuid("daily_log_id").notNull(),
    actionId: uuid("action_id"),
    title: text("title").notNull(),
    done: boolean("done").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("daily_focus_activities_log_idx").on(t.dailyLogId, t.sortOrder)],
);
