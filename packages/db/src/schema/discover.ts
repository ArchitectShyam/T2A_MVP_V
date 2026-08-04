import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Discover feature schema. Mirrors packages/db/manual/discover.sql (which is
 * applied by hand in the Supabase SQL Editor because this network blocks
 * outbound Postgres). Column names are snake_case in Postgres; Drizzle exposes
 * camelCase. Data access goes through the Supabase REST client with RLS — these
 * definitions exist for type-safety and migration parity, not runtime queries.
 */

// --- Enums -----------------------------------------------------------------
export const discoverItemStatusEnum = pgEnum("discover_item_status", [
  "active",
  "retired",
]);
export const strengthNatureEnum = pgEnum("strength_nature", ["strength", "growth_area"]);
export const desiredDevelopmentEnum = pgEnum("desired_development", [
  "leverage_more",
  "improve",
]);
export const operatingStatusEnum = pgEnum("operating_status", [
  "active",
  "parked",
  "dropped",
  "merged",
]);
export const lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "captured",
  "exploring",
  "refined",
  "converted",
  "achieved",
]);
export const timeHorizonEnum = pgEnum("time_horizon", ["short", "medium", "long", "lifetime"]);
export const aspirationTypeEnum = pgEnum("aspiration_type", [
  "experience",
  "achievement",
  "contribution",
  "growth",
  "habit",
  "skill",
]);
export const typeSourceEnum = pgEnum("type_source", ["declared", "derived"]);

// --- Catalog tables (system + user-created) --------------------------------
export const valuesCatalog = pgTable(
  "values",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    createdByUserId: uuid("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("values_created_by_idx").on(t.createdByUserId)],
);

export const strengthsCatalog = pgTable(
  "strengths",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    createdByUserId: uuid("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("strengths_created_by_idx").on(t.createdByUserId)],
);

export const interestsCatalog = pgTable(
  "interests",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    createdByUserId: uuid("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("interests_created_by_idx").on(t.createdByUserId)],
);

// --- User personalization tables (catalog-backed) --------------------------
export const userValues = pgTable(
  "user_values",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    valueId: uuid("value_id").notNull(),
    isCore: boolean("is_core").notNull().default(false),
    rank: integer("rank"),
    whyItMatters: text("why_it_matters"),
    exampleBehaviors: text("example_behaviors"),
    status: discoverItemStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("user_values_user_created_idx").on(t.userId, t.createdAt)],
);

export const userStrengths = pgTable(
  "user_strengths",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    strengthId: uuid("strength_id").notNull(),
    isSignature: boolean("is_signature").notNull().default(false),
    rank: integer("rank"),
    nature: strengthNatureEnum("nature").notNull().default("strength"),
    personalNote: text("personal_note"),
    evidenceNote: text("evidence_note"),
    desiredDevelopment: desiredDevelopmentEnum("desired_development"),
    status: discoverItemStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("user_strengths_user_created_idx").on(t.userId, t.createdAt)],
);

export const userInterests = pgTable(
  "user_interests",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    interestId: uuid("interest_id").notNull(),
    isCore: boolean("is_core").notNull().default(false),
    rank: integer("rank"),
    personalNote: text("personal_note"),
    status: discoverItemStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("user_interests_user_created_idx").on(t.userId, t.createdAt)],
);

// --- User-owned tables (no catalog) ----------------------------------------
export const beliefs = pgTable(
  "beliefs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    statement: text("statement").notNull(),
    description: text("description"),
    evidenceFor: text("evidence_for"),
    isCore: boolean("is_core").notNull().default(false),
    rank: integer("rank"),
    operatingStatus: operatingStatusEnum("operating_status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("beliefs_user_created_idx").on(t.userId, t.createdAt)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    keyPeople: text("key_people"),
    isCore: boolean("is_core").notNull().default(false),
    rank: integer("rank"),
    status: discoverItemStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("user_roles_user_created_idx").on(t.userId, t.createdAt)],
);

export const aspirations = pgTable(
  "aspirations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    visualizationNote: text("visualization_note"),
    operatingStatus: operatingStatusEnum("operating_status").notNull().default("active"),
    lifecycleStatus: lifecycleStatusEnum("lifecycle_status").notNull().default("captured"),
    timeHorizon: timeHorizonEnum("time_horizon"),
    isBucketList: boolean("is_bucket_list").notNull().default(false),
    importanceScore: integer("importance_score"),
    rank: integer("rank"),
    aspirationType: aspirationTypeEnum("aspiration_type"),
    typeSource: typeSourceEnum("type_source"),
    typeDerivedAt: timestamp("type_derived_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("aspirations_user_importance_idx").on(
      t.userId,
      t.importanceScore.desc().nullsLast(),
      t.createdAt,
    ),
    index("aspirations_user_rank_idx").on(
      t.userId,
      t.rank,
      t.importanceScore.desc().nullsLast(),
      t.createdAt,
    ),
  ],
);
