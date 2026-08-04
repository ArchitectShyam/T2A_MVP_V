-- ===========================================================================
-- LifeOS — Discover feature schema (values, beliefs, strengths, interests,
-- roles, aspirations). Run manually in the Supabase SQL Editor (this network
-- blocks outbound Postgres, so drizzle-kit migrate cannot connect).
--
-- Safe to run once on a fresh project; idempotent-ish (IF NOT EXISTS / DO
-- blocks for enums / DROP POLICY IF EXISTS).
--
-- Access model: authenticated users read/write ONLY their own rows via RLS.
-- Catalog tables (values/strengths/interests) additionally expose shared
-- "system" rows for everyone to read; user-created catalog rows are private to
-- their author. Rename of a catalog-backed item clones the row (never mutates
-- a shared/system name) — enforced in the data-access layer.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discover_item_status') THEN
		CREATE TYPE "public"."discover_item_status" AS ENUM ('active', 'retired');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'strength_nature') THEN
		CREATE TYPE "public"."strength_nature" AS ENUM ('strength', 'growth_area');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'desired_development') THEN
		CREATE TYPE "public"."desired_development" AS ENUM ('leverage_more', 'improve');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operating_status') THEN
		CREATE TYPE "public"."operating_status" AS ENUM ('active', 'parked', 'dropped', 'merged');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lifecycle_status') THEN
		CREATE TYPE "public"."lifecycle_status" AS ENUM ('captured', 'exploring', 'refined', 'converted', 'achieved');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'time_horizon') THEN
		CREATE TYPE "public"."time_horizon" AS ENUM ('short', 'medium', 'long', 'lifetime');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aspiration_type') THEN
		CREATE TYPE "public"."aspiration_type" AS ENUM ('experience', 'achievement', 'contribution', 'growth', 'habit', 'skill');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_source') THEN
		CREATE TYPE "public"."type_source" AS ENUM ('declared', 'derived');
	END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Catalog tables (shared system rows + private user-created rows)
-- NOTE: "values" is a reserved word — always quote it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean NOT NULL DEFAULT false,
	"created_by_user_id" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "strengths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean NOT NULL DEFAULT false,
	"created_by_user_id" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean NOT NULL DEFAULT false,
	"created_by_user_id" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- User personalization tables (catalog-backed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "user_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"value_id" uuid NOT NULL REFERENCES "values"("id") ON DELETE CASCADE,
	"is_core" boolean NOT NULL DEFAULT false,
	"rank" integer,
	"why_it_matters" text,           -- -> note
	"example_behaviors" text,        -- -> evidence (newline-joined)
	"status" "discover_item_status" NOT NULL DEFAULT 'active',
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_strengths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"strength_id" uuid NOT NULL REFERENCES "strengths"("id") ON DELETE CASCADE,
	"is_signature" boolean NOT NULL DEFAULT false,   -- -> isCore
	"rank" integer,
	"nature" "strength_nature" NOT NULL DEFAULT 'strength',
	"personal_note" text,            -- -> note
	"evidence_note" text,            -- -> evidence (newline-joined)
	"desired_development" "desired_development",
	"status" "discover_item_status" NOT NULL DEFAULT 'active',
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"interest_id" uuid NOT NULL REFERENCES "interests"("id") ON DELETE CASCADE,
	"is_core" boolean NOT NULL DEFAULT false,
	"rank" integer,
	"personal_note" text,            -- -> note (no evidence for interests)
	"status" "discover_item_status" NOT NULL DEFAULT 'active',
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- User-owned tables (no catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "beliefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"statement" text NOT NULL,       -- -> text
	"description" text,              -- -> note
	"evidence_for" text,            -- -> evidence (newline-joined)
	"is_core" boolean NOT NULL DEFAULT false,
	"rank" integer,
	"operating_status" "operating_status" NOT NULL DEFAULT 'active',
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"title" text NOT NULL,           -- -> text
	"description" text,              -- -> note
	"key_people" text,              -- -> evidence (newline-joined)
	"is_core" boolean NOT NULL DEFAULT false,
	"rank" integer,
	"status" "discover_item_status" NOT NULL DEFAULT 'active',
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "aspirations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"title" text NOT NULL,           -- -> text
	"description" text,              -- -> note
	"visualization_note" text,       -- -> evidence (newline-joined)
	"operating_status" "operating_status" NOT NULL DEFAULT 'active',
	"lifecycle_status" "lifecycle_status" NOT NULL DEFAULT 'captured',
	"time_horizon" "time_horizon",
	"is_bucket_list" boolean NOT NULL DEFAULT false,
	"importance_score" integer CHECK ("importance_score" BETWEEN 0 AND 10),
	"aspiration_type" "aspiration_type",
	"type_source" "type_source",
	"type_derived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "user_values_user_created_idx"     ON "user_values"     USING btree ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "user_strengths_user_created_idx"  ON "user_strengths"  USING btree ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "user_interests_user_created_idx"  ON "user_interests"  USING btree ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "beliefs_user_created_idx"         ON "beliefs"         USING btree ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "user_roles_user_created_idx"      ON "user_roles"      USING btree ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "aspirations_user_importance_idx"  ON "aspirations"     USING btree ("user_id", "importance_score" DESC NULLS LAST, "created_at");
CREATE INDEX IF NOT EXISTS "values_created_by_idx"            ON "values"          USING btree ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "strengths_created_by_idx"         ON "strengths"       USING btree ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "interests_created_by_idx"         ON "interests"       USING btree ("created_by_user_id");

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Enable RLS explicitly (static statements so linters/analyzers can see them),
-- then attach policies. Enabling RLS with no policy denies all access, so the
-- policies below are what actually grant scoped access.
-- ---------------------------------------------------------------------------
ALTER TABLE "values"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "strengths"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interests"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_values"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_strengths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_interests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "beliefs"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aspirations"    ENABLE ROW LEVEL SECURITY;

-- Catalog tables: read system rows + own rows; write only own non-system rows.
DO $$
DECLARE t text;
BEGIN
	FOREACH t IN ARRAY ARRAY['values', 'strengths', 'interests'] LOOP
		EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
		EXECUTE format(
			'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING ("is_system" OR "created_by_user_id" = (select auth.uid()))',
			t || '_select', t);

		EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
		EXECUTE format(
			'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK ("is_system" = false AND "created_by_user_id" = (select auth.uid()))',
			t || '_insert', t);

		EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update', t);
		EXECUTE format(
			'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING ("is_system" = false AND "created_by_user_id" = (select auth.uid())) WITH CHECK ("is_system" = false AND "created_by_user_id" = (select auth.uid()))',
			t || '_update', t);
	END LOOP;
END $$;

-- User tables: full CRUD on own rows only.
DO $$
DECLARE t text;
BEGIN
	FOREACH t IN ARRAY ARRAY['user_values', 'user_strengths', 'user_interests', 'beliefs', 'user_roles', 'aspirations'] LOOP
		EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
		EXECUTE format(
			'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING ((select auth.uid()) = "user_id")',
			t || '_select', t);

		EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
		EXECUTE format(
			'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = "user_id")',
			t || '_insert', t);

		EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update', t);
		EXECUTE format(
			'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING ((select auth.uid()) = "user_id") WITH CHECK ((select auth.uid()) = "user_id")',
			t || '_update', t);

		EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete', t);
		EXECUTE format(
			'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING ((select auth.uid()) = "user_id")',
			t || '_delete', t);
	END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Optional seed: a few shared system catalog rows to get started.
-- (created_by_user_id NULL, is_system true.) Add/remove freely.
-- ---------------------------------------------------------------------------
INSERT INTO "values" ("name", "is_system")
SELECT v, true FROM (VALUES
	('Integrity'), ('Creativity'), ('Growth'), ('Compassion'), ('Freedom'),
	('Curiosity'), ('Discipline'), ('Family'), ('Health'), ('Adventure')
) AS s(v)
WHERE NOT EXISTS (SELECT 1 FROM "values" x WHERE x."name" = s.v AND x."is_system");

INSERT INTO "strengths" ("name", "is_system")
SELECT v, true FROM (VALUES
	('Strategic thinking'), ('Empathy'), ('Communication'), ('Focus'),
	('Adaptability'), ('Leadership'), ('Problem solving'), ('Discipline')
) AS s(v)
WHERE NOT EXISTS (SELECT 1 FROM "strengths" x WHERE x."name" = s.v AND x."is_system");

INSERT INTO "interests" ("name", "is_system")
SELECT v, true FROM (VALUES
	('Reading'), ('Music'), ('Fitness'), ('Travel'), ('Cooking'),
	('Photography'), ('Technology'), ('Nature')
) AS s(v)
WHERE NOT EXISTS (SELECT 1 FROM "interests" x WHERE x."name" = s.v AND x."is_system");

NOTIFY pgrst, 'reload schema';
