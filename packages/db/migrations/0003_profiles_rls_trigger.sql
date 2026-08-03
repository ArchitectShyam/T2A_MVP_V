-- Custom SQL migration file, put your code below! --

-- Link profiles 1:1 to Supabase auth.users; deleting the auth user removes the
-- profile.
ALTER TABLE "profiles"
	ADD CONSTRAINT "profiles_id_auth_users_fk"
	FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- Auto-provision a profile whenever a new auth user signs up. SECURITY DEFINER
-- lets the trigger bypass RLS to insert the row. plan/trial columns fall back
-- to their table defaults (free plan, 3-month trial).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	INSERT INTO public.profiles (id, email, full_name)
	VALUES (
		NEW.id,
		NEW.email,
		NULLIF(NEW.raw_user_meta_data ->> 'full_name', '')
	)
	ON CONFLICT (id) DO NOTHING;
	RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint

CREATE TRIGGER on_auth_user_created
	AFTER INSERT ON auth.users
	FOR EACH ROW
	EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint

-- Row Level Security: a user may read only their own profile. There are
-- deliberately no INSERT/UPDATE/DELETE policies — provisioning happens via the
-- SECURITY DEFINER trigger and plan changes happen server-side with the service
-- role, so the client can never escalate its own plan.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "profiles_select_own" ON "profiles"
	FOR SELECT
	TO authenticated
	USING ((select auth.uid()) = "id");