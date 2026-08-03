-- Custom SQL migration file, put your code below! --

-- Row Level Security for `tasks`.
--
-- Every row is owned by the authenticated user identified by `auth.uid()`.
-- The `(select auth.uid())` form lets Postgres evaluate the function once per
-- statement (initPlan) instead of once per row — the pattern recommended by
-- Supabase for performant RLS.

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "tasks_select_own" ON "tasks"
	FOR SELECT
	TO authenticated
	USING ((select auth.uid()) = "user_id");
--> statement-breakpoint

CREATE POLICY "tasks_insert_own" ON "tasks"
	FOR INSERT
	TO authenticated
	WITH CHECK ((select auth.uid()) = "user_id");
--> statement-breakpoint

CREATE POLICY "tasks_update_own" ON "tasks"
	FOR UPDATE
	TO authenticated
	USING ((select auth.uid()) = "user_id")
	WITH CHECK ((select auth.uid()) = "user_id");
--> statement-breakpoint

CREATE POLICY "tasks_delete_own" ON "tasks"
	FOR DELETE
	TO authenticated
	USING ((select auth.uid()) = "user_id");