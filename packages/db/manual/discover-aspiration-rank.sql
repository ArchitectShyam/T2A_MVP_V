-- ===========================================================================
-- LifeOS — Discover: add position-based priority (rank) to aspirations.
-- Run manually in the Supabase SQL Editor (outbound Postgres is blocked here).
--
-- Aspirations become a drag-orderable priority list (like beliefs/roles).
-- `rank` = 1-based position in the user's list; lower rank = higher priority.
-- Existing rows are backfilled from the current importance-based ordering so
-- nothing jumps around on first load.
-- ===========================================================================

ALTER TABLE "aspirations" ADD COLUMN IF NOT EXISTS "rank" integer;

-- Backfill: seed rank from the existing importance/created ordering, per user,
-- across the currently-visible (active/parked) rows.
WITH ordered AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "user_id"
			ORDER BY "importance_score" DESC NULLS LAST, "created_at" ASC
		) AS rn
	FROM "aspirations"
	WHERE "operating_status" IN ('active', 'parked')
)
UPDATE "aspirations" a
SET "rank" = o.rn
FROM ordered o
WHERE a."id" = o."id" AND a."rank" IS NULL;

-- Order by rank first (nulls last), then the previous tie-breakers.
CREATE INDEX IF NOT EXISTS "aspirations_user_rank_idx"
	ON "aspirations" USING btree ("user_id", "rank", "importance_score" DESC NULLS LAST, "created_at");

NOTIFY pgrst, 'reload schema';
