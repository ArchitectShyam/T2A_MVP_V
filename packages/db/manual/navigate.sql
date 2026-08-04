-- ===========================================================================
-- LifeOS — Navigate feature schema (the "Wheel of action" daily-execution
-- surface). Six practice segments (Actions, Habits, Nudges, Rituals,
-- Reflections, Routines) + a daily check-in/check-out hub.
--
-- Run manually in the Supabase SQL Editor (this network blocks outbound
-- Postgres, so drizzle-kit migrate cannot connect). Idempotent-ish
-- (IF NOT EXISTS / DO blocks for enums / DROP POLICY IF EXISTS).
--
-- Access model: authenticated users read/write ONLY their own rows via RLS.
-- `practice_steps` have no user_id — scoped through the parent practice.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'practice_type') THEN
		CREATE TYPE "public"."practice_type" AS ENUM ('habit', 'routine', 'ritual');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'practice_polarity') THEN
		CREATE TYPE "public"."practice_polarity" AS ENUM ('good', 'bad');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'practice_schedule') THEN
		CREATE TYPE "public"."practice_schedule" AS ENUM ('daily', 'weekdays', 'weekly', 'custom');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reflection_type') THEN
		CREATE TYPE "public"."reflection_type" AS ENUM ('daily', 'deep', 'guided', 'self_initiated');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nudge_response') THEN
		CREATE TYPE "public"."nudge_response" AS ENUM ('up', 'neutral', 'down');
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'identity_element_type') THEN
		CREATE TYPE "public"."identity_element_type" AS ENUM ('value', 'belief', 'strength', 'role', 'interest', 'aspiration');
	END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Practices (habits / routines / rituals)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "practices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"practice_type" "practice_type" NOT NULL,
	"title" text NOT NULL,
	"polarity" "practice_polarity" NOT NULL DEFAULT 'good',
	"schedule" "practice_schedule" NOT NULL DEFAULT 'daily',
	"schedule_detail" jsonb,
	"time_of_day" text,
	"domain_id" uuid REFERENCES "domains"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	"deleted_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "practices_user_type_idx" ON "practices" USING btree ("user_id", "practice_type");

-- ---------------------------------------------------------------------------
-- Practice steps (routine steps; no user_id — scoped via parent practice)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "practice_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practice_id" uuid NOT NULL REFERENCES "practices"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"sequence" integer NOT NULL DEFAULT 1,
	"is_optional" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "practice_steps_practice_idx" ON "practice_steps" USING btree ("practice_id", "sequence");

-- ---------------------------------------------------------------------------
-- Ritual details (a practice elevated to ritual status)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ritual_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"practice_id" uuid NOT NULL UNIQUE REFERENCES "practices"("id") ON DELETE CASCADE,
	"intention" text,
	"marked_ritual_at" timestamp with time zone NOT NULL DEFAULT now(),
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ritual_details_user_idx" ON "ritual_details" USING btree ("user_id", "practice_id");

-- ---------------------------------------------------------------------------
-- Ritual identity links (link Discover elements to a ritual)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ritual_identity_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"ritual_practice_id" uuid NOT NULL REFERENCES "practices"("id") ON DELETE CASCADE,
	"element_type" "identity_element_type" NOT NULL,
	"element_id" uuid NOT NULL,
	"element_label" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ritual_identity_links_practice_idx" ON "ritual_identity_links" USING btree ("ritual_practice_id");

-- ---------------------------------------------------------------------------
-- Reflections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "reflections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"reflection_type" "reflection_type" NOT NULL DEFAULT 'daily',
	"depth_trigger" text,
	"prompt" text,
	"body" text NOT NULL,
	"entry_date" date NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "reflections_user_date_idx" ON "reflections" USING btree ("user_id", "entry_date");

-- ---------------------------------------------------------------------------
-- Nudges (read-only content; user records a response)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "nudges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"detail" text,
	"kind" text NOT NULL DEFAULT 'insight',
	"domain_id" uuid REFERENCES "domains"("id") ON DELETE SET NULL,
	"nudge_date" date NOT NULL,
	"response" "nudge_response",
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "nudges_user_date_idx" ON "nudges" USING btree ("user_id", "nudge_date");

-- ---------------------------------------------------------------------------
-- Daily logs (one per user per day)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"log_date" date NOT NULL,
	"committed_at" timestamp with time zone,
	"checked_out_at" timestamp with time zone,
	"checkout_summary" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	UNIQUE ("user_id", "log_date")
);
CREATE INDEX IF NOT EXISTS "daily_logs_user_date_idx" ON "daily_logs" USING btree ("user_id", "log_date");

-- ---------------------------------------------------------------------------
-- Daily focus activities (today's plan)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "daily_focus_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"daily_log_id" uuid NOT NULL REFERENCES "daily_logs"("id") ON DELETE CASCADE,
	"action_id" uuid REFERENCES "actions"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"done" boolean NOT NULL DEFAULT false,
	"sort_order" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "daily_focus_activities_log_idx" ON "daily_focus_activities" USING btree ("daily_log_id", "sort_order");

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE "practices"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "practice_steps"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ritual_details"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ritual_identity_links"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reflections"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nudges"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_logs"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_focus_activities"  ENABLE ROW LEVEL SECURITY;

-- User-owned tables: full CRUD on own rows only.
DO $$
DECLARE t text;
BEGIN
	FOREACH t IN ARRAY ARRAY[
		'practices', 'ritual_details', 'ritual_identity_links', 'reflections',
		'nudges', 'daily_logs', 'daily_focus_activities'
	] LOOP
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

-- Practice steps: no user_id — scoped through the parent practice's owner.
DROP POLICY IF EXISTS "practice_steps_select" ON "practice_steps";
CREATE POLICY "practice_steps_select" ON "practice_steps"
	FOR SELECT TO authenticated USING (
		EXISTS (SELECT 1 FROM "practices" p WHERE p."id" = "practice_steps"."practice_id" AND p."user_id" = (select auth.uid()))
	);

DROP POLICY IF EXISTS "practice_steps_insert" ON "practice_steps";
CREATE POLICY "practice_steps_insert" ON "practice_steps"
	FOR INSERT TO authenticated WITH CHECK (
		EXISTS (SELECT 1 FROM "practices" p WHERE p."id" = "practice_steps"."practice_id" AND p."user_id" = (select auth.uid()))
	);

DROP POLICY IF EXISTS "practice_steps_update" ON "practice_steps";
CREATE POLICY "practice_steps_update" ON "practice_steps"
	FOR UPDATE TO authenticated USING (
		EXISTS (SELECT 1 FROM "practices" p WHERE p."id" = "practice_steps"."practice_id" AND p."user_id" = (select auth.uid()))
	) WITH CHECK (
		EXISTS (SELECT 1 FROM "practices" p WHERE p."id" = "practice_steps"."practice_id" AND p."user_id" = (select auth.uid()))
	);

DROP POLICY IF EXISTS "practice_steps_delete" ON "practice_steps";
CREATE POLICY "practice_steps_delete" ON "practice_steps"
	FOR DELETE TO authenticated USING (
		EXISTS (SELECT 1 FROM "practices" p WHERE p."id" = "practice_steps"."practice_id" AND p."user_id" = (select auth.uid()))
	);

NOTIFY pgrst, 'reload schema';
