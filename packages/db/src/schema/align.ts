import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Align feature schema — the "All your summits" goal-execution surface. Mirrors
 * packages/db/manual/align.sql (applied by hand in the Supabase SQL Editor
 * because this network blocks outbound Postgres). Column names are snake_case
 * in Postgres; Drizzle exposes camelCase. Runtime access goes through the
 * Supabase REST client with RLS — these definitions exist for type-safety and
 * migration parity, not runtime queries.
 *
 * Hierarchy: Summit -> Journey -> Action -> Step. Summits/journeys/actions are
 * soft-deleted (deletedAt); steps are hard-deleted (no deletedAt, no userId —
 * reached via their parent action).
 */

// --- Enums -----------------------------------------------------------------
export const summitStatusEnum = pgEnum("summit_status", [
  "planned",
  "active",
  "achieved",
  "archived",
]);
export const actionStatusEnum = pgEnum("action_status", [
  "todo",
  "in_progress",
  "done",
]);

// --- Domains (shared reference data) ---------------------------------------
export const domains = pgTable(
  "domains",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: text("code").notNull(),
    name: text("name").notNull(),
    dimension: text("dimension").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("domains_code_idx").on(t.code)],
);

// --- Summits ---------------------------------------------------------------
export const summits = pgTable(
  "summits",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    domainId: uuid("domain_id").notNull(),
    title: text("title").notNull(),
    priority: integer("priority"),
    description: text("description"),
    definitionOfDone: text("definition_of_done"),
    plannedStartDate: date("planned_start_date"),
    targetDate: date("target_date"),
    status: summitStatusEnum("status").notNull().default("planned"),
    progressPct: integer("progress_pct").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    index("summits_user_priority_idx").on(t.userId, t.priority, t.createdAt),
    index("summits_domain_idx").on(t.domainId),
  ],
);

// --- Journeys --------------------------------------------------------------
export const journeys = pgTable(
  "journeys",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    summitId: uuid("summit_id").notNull(),
    title: text("title").notNull(),
    sequence: integer("sequence"),
    description: text("description"),
    outcome: text("outcome"),
    plannedStartDate: date("planned_start_date"),
    targetDate: date("target_date"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [index("journeys_summit_idx").on(t.summitId, t.sequence)],
);

// --- Actions ---------------------------------------------------------------
export const actions = pgTable(
  "actions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    journeyId: uuid("journey_id").notNull(),
    title: text("title").notNull(),
    sequence: integer("sequence"),
    description: text("description"),
    dueDate: date("due_date"),
    estimatedEffort: integer("estimated_effort"),
    status: actionStatusEnum("status").notNull().default("todo"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [index("actions_journey_idx").on(t.journeyId, t.sequence)],
);

// --- Steps (leaf; no userId, no deletedAt) ---------------------------------
export const steps = pgTable(
  "steps",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    actionId: uuid("action_id").notNull(),
    title: text("title").notNull(),
    sequence: integer("sequence"),
    plannedAt: timestamp("planned_at", { withTimezone: true, mode: "date" }),
    estimatedEffortMinutes: integer("estimated_effort_minutes"),
    isDone: boolean("is_done").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("steps_action_idx").on(t.actionId, t.sequence)],
);

// --- Monthly focus slots ---------------------------------------------------
export const monthlySummitSlots = pgTable(
  "monthly_summit_slots",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    summitId: uuid("summit_id").notNull(),
    monthStart: date("month_start").notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("monthly_summit_slots_user_month_idx").on(t.userId, t.monthStart)],
);

// --- Domain alignment scores (inner-ring gauges) ---------------------------
export const domainAlignmentScores = pgTable(
  "domain_alignment_scores",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    domainId: uuid("domain_id").notNull(),
    alignmentScore: smallint("alignment_score").notNull(),
    periodStart: date("period_start").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("domain_alignment_user_period_idx").on(t.userId, t.periodStart),
  ],
);
