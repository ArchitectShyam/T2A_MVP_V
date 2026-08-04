-- ===========================================================================
-- LifeOS — Align feature schema ("All your summits"). Execution hierarchy:
-- Summit -> Journey -> Action -> Step, plus monthly focus slots and per-domain
-- alignment scores that drive the Wheel of Life.
--
-- Run manually in the Supabase SQL Editor (this network blocks outbound
-- Postgres, so drizzle-kit migrate cannot connect). Idempotent-ish
-- (IF NOT EXISTS / DO blocks for enums / DROP POLICY IF EXISTS).
--
-- Access model: authenticated users read/write ONLY their own rows via RLS.
-- `domains` is shared reference data (readable by every authenticated user).
-- `steps` have no user_id — they are scoped through their parent action.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'summit_status') THEN
		CREATE TYPE "public"."summit_status" AS ENUM ('planned', 'active', 'achieved', 'archived');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_status') THEN
		CREATE TYPE "public"."action_status" AS ENUM ('todo', 'in_progress', 'done');
	END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Domains (shared reference data — 4 dimensions x 3 domains)
-- Three codes differ from the app's framework keys:
--   adventure -> adventures, love -> intimacy, connect -> connects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"dimension" text NOT NULL,
	"sort_order" integer NOT NULL DEFAULT 0,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "domains_code_idx" ON "domains" USING btree ("code");

-- ---------------------------------------------------------------------------
-- Summits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "summits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE RESTRICT,
	"title" text NOT NULL,
	"priority" integer,
	"description" text,
	"definition_of_done" text,          -- -> "success criteria"
	"planned_start_date" date,
	"target_date" date,
	"status" "summit_status" NOT NULL DEFAULT 'planned',
	"progress_pct" integer NOT NULL DEFAULT 0,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	"deleted_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "summits_user_priority_idx" ON "summits" USING btree ("user_id", "priority", "created_at");
CREATE INDEX IF NOT EXISTS "summits_domain_idx" ON "summits" USING btree ("domain_id");

-- ---------------------------------------------------------------------------
-- Journeys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"summit_id" uuid NOT NULL REFERENCES "summits"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"sequence" integer,
	"description" text,
	"outcome" text,
	"planned_start_date" date,
	"target_date" date,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	"deleted_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "journeys_summit_idx" ON "journeys" USING btree ("summit_id", "sequence");

-- ---------------------------------------------------------------------------
-- Actions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"journey_id" uuid NOT NULL REFERENCES "journeys"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"sequence" integer,
	"description" text,
	"due_date" date,
	"estimated_effort" integer,
	"status" "action_status" NOT NULL DEFAULT 'todo',
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	"deleted_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "actions_journey_idx" ON "actions" USING btree ("journey_id", "sequence");

-- ---------------------------------------------------------------------------
-- Steps (leaf level: no user_id, no deleted_at — hard-deleted)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL REFERENCES "actions"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"sequence" integer,
	"planned_at" timestamp with time zone,
	"estimated_effort_minutes" integer,
	"is_done" boolean NOT NULL DEFAULT false,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "steps_action_idx" ON "steps" USING btree ("action_id", "sequence");

-- ---------------------------------------------------------------------------
-- Monthly focus slots (a summit is "active" when it holds a non-released slot
-- for the current month)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "monthly_summit_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"summit_id" uuid NOT NULL REFERENCES "summits"("id") ON DELETE CASCADE,
	"month_start" date NOT NULL,        -- first-of-month
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "monthly_summit_slots_user_month_idx" ON "monthly_summit_slots" USING btree ("user_id", "month_start");

-- ---------------------------------------------------------------------------
-- Domain alignment scores (inner-ring gauges, 1..10)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "domain_alignment_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"domain_id" uuid NOT NULL REFERENCES "domains"("id") ON DELETE CASCADE,
	"alignment_score" smallint NOT NULL CHECK ("alignment_score" BETWEEN 1 AND 10),
	"period_start" date NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "domain_alignment_user_period_idx" ON "domain_alignment_scores" USING btree ("user_id", "period_start");

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE "domains"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "summits"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journeys"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "actions"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "steps"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "monthly_summit_slots"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "domain_alignment_scores" ENABLE ROW LEVEL SECURITY;

-- Domains: readable by every authenticated user (shared reference data). No
-- write policies — seeded/maintained by admins via the service role.
DROP POLICY IF EXISTS "domains_select" ON "domains";
CREATE POLICY "domains_select" ON "domains"
	FOR SELECT TO authenticated USING (true);

-- User-owned execution tables: full CRUD on own rows only.
DO $$
DECLARE t text;
BEGIN
	FOREACH t IN ARRAY ARRAY['summits', 'journeys', 'actions', 'monthly_summit_slots', 'domain_alignment_scores'] LOOP
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

-- Steps: no user_id — scoped through the parent action's owner.
DROP POLICY IF EXISTS "steps_select" ON "steps";
CREATE POLICY "steps_select" ON "steps"
	FOR SELECT TO authenticated USING (
		EXISTS (SELECT 1 FROM "actions" a WHERE a."id" = "steps"."action_id" AND a."user_id" = (select auth.uid()))
	);

DROP POLICY IF EXISTS "steps_insert" ON "steps";
CREATE POLICY "steps_insert" ON "steps"
	FOR INSERT TO authenticated WITH CHECK (
		EXISTS (SELECT 1 FROM "actions" a WHERE a."id" = "steps"."action_id" AND a."user_id" = (select auth.uid()))
	);

DROP POLICY IF EXISTS "steps_update" ON "steps";
CREATE POLICY "steps_update" ON "steps"
	FOR UPDATE TO authenticated USING (
		EXISTS (SELECT 1 FROM "actions" a WHERE a."id" = "steps"."action_id" AND a."user_id" = (select auth.uid()))
	) WITH CHECK (
		EXISTS (SELECT 1 FROM "actions" a WHERE a."id" = "steps"."action_id" AND a."user_id" = (select auth.uid()))
	);

DROP POLICY IF EXISTS "steps_delete" ON "steps";
CREATE POLICY "steps_delete" ON "steps"
	FOR DELETE TO authenticated USING (
		EXISTS (SELECT 1 FROM "actions" a WHERE a."id" = "steps"."action_id" AND a."user_id" = (select auth.uid()))
	);

-- ---------------------------------------------------------------------------
-- Seed the 12 domains (idempotent by unique code).
-- ---------------------------------------------------------------------------
INSERT INTO "domains" ("code", "name", "dimension", "sort_order")
SELECT * FROM (VALUES
	('skills',       'Skills',       'work',  1),
	('profession',   'Profession',   'work',  2),
	('wealth',       'Wealth',       'work',  3),
	('health',       'Health',       'body',  4),
	('mind',         'Mind',         'body',  5),
	('nutrition',    'Nutrition',    'body',  6),
	('creativity',   'Creativity',   'soul',  7),
	('adventure',    'Adventures',   'soul',  8),
	('spirituality', 'Spirituality', 'soul',  9),
	('love',         'Intimacy',     'heart', 10),
	('family',       'Family',       'heart', 11),
	('connect',      'Connects',     'heart', 12)
) AS s("code", "name", "dimension", "sort_order")
WHERE NOT EXISTS (SELECT 1 FROM "domains" d WHERE d."code" = s."code");

NOTIFY pgrst, 'reload schema';
