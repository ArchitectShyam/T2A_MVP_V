-- ===========================================================================
-- LifeOS — full schema, applied manually via the Supabase SQL Editor.
--
-- WHY THIS FILE EXISTS: this network blocks outbound Postgres (ports 5432 and
-- 6543), so `drizzle-kit migrate` cannot connect. The SQL Editor talks over
-- HTTPS (443), which is allowed. Paste this whole file into
-- Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- It is the concatenation of packages/db/migrations/0000..0003 and is
-- idempotent-ish where practical. Safe to run once on a fresh project.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0000: tasks table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tasks_user_id_created_at_idx"
	ON "tasks" USING btree ("user_id", "created_at" DESC NULLS LAST);

-- ---------------------------------------------------------------------------
-- 0001: tasks Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_own" ON "tasks";
CREATE POLICY "tasks_select_own" ON "tasks"
	FOR SELECT TO authenticated
	USING ((select auth.uid()) = "user_id");

DROP POLICY IF EXISTS "tasks_insert_own" ON "tasks";
CREATE POLICY "tasks_insert_own" ON "tasks"
	FOR INSERT TO authenticated
	WITH CHECK ((select auth.uid()) = "user_id");

DROP POLICY IF EXISTS "tasks_update_own" ON "tasks";
CREATE POLICY "tasks_update_own" ON "tasks"
	FOR UPDATE TO authenticated
	USING ((select auth.uid()) = "user_id")
	WITH CHECK ((select auth.uid()) = "user_id");

DROP POLICY IF EXISTS "tasks_delete_own" ON "tasks";
CREATE POLICY "tasks_delete_own" ON "tasks"
	FOR DELETE TO authenticated
	USING ((select auth.uid()) = "user_id");

-- ---------------------------------------------------------------------------
-- 0002: plan enum + profiles table
-- ---------------------------------------------------------------------------
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan') THEN
		CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'premium');
	END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"phone" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"plan_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trial_ends_at" timestamp with time zone DEFAULT now() + interval '3 months' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ---------------------------------------------------------------------------
-- 0003: profiles FK to auth.users, signup trigger, RLS
-- ---------------------------------------------------------------------------
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_auth_users_fk'
	) THEN
		ALTER TABLE "profiles"
			ADD CONSTRAINT "profiles_id_auth_users_fk"
			FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
	END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	INSERT INTO public.profiles (id, email, full_name, phone)
	VALUES (
		NEW.id,
		NEW.email,
		NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
		NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
	)
	ON CONFLICT (id) DO NOTHING;
	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
	AFTER INSERT ON auth.users
	FOR EACH ROW
	EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON "profiles";
CREATE POLICY "profiles_select_own" ON "profiles"
	FOR SELECT TO authenticated
	USING ((select auth.uid()) = "id");
