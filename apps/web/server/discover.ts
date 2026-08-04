import {
  type AspirationMetaPatch,
  type DiscoverCategory,
  type DiscoverCategoryKey,
  DISCOVER_CATEGORY_META,
  discoverCategoryKeys,
  MAX_CORE,
  MAX_SIGNATURE_GROWTH,
  MAX_SIGNATURE_STRENGTHS,
} from "@lifeos/contracts";
import { createSupabaseServerClient } from "@lifeos/db/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseEnv } from "./env.js";

/**
 * Server-only data access for the Discover feature. Uses the authenticated
 * Supabase cookie client; RLS scopes every row to the signed-in user. The
 * client never imports this module — only the transport-safe types from
 * `@lifeos/contracts`.
 *
 * (We use Supabase REST over HTTPS rather than direct Postgres because this
 * network blocks the Postgres ports — same rationale as the profiles feature.)
 */

type SupabaseClient = ReturnType<typeof createSupabaseServerClient>;

/** Creates the cookie-bound Supabase client. Cookie writes are swallowed in
 * read (RSC) contexts where mutation isn't allowed; middleware handles refresh. */
async function getClient(): Promise<SupabaseClient> {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase is not configured.");
  const cookieStore = await cookies();
  return createSupabaseServerClient(env.url, env.anonKey, {
    getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (toSet) => {
      try {
        for (const { name, value, options } of toSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Called from a Server Component render — cookies are read-only here.
      }
    },
  });
}

/** Resolves the authenticated user, redirecting to /login when signed out. */
export async function requireUser(): Promise<{
  supabase: SupabaseClient;
  userId: string;
}> {
  const supabase = await getClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

// ---------------------------------------------------------------------------
// Per-category configuration
// ---------------------------------------------------------------------------
interface CategoryConfig {
  table: string;
  /** Catalog-backed categories join a shared catalog for the display text. */
  catalog?: { table: string; fk: string };
  /** User-owned categories store the display text directly on this column. */
  textCol?: string;
  noteCol: string;
  /** Interests have no evidence column. */
  evidenceCol?: string;
  coreCol?: string;
  rankCol?: string;
  statusCol: string;
  retiredValue: string;
}

const CONFIG: Record<DiscoverCategoryKey, CategoryConfig> = {
  values: {
    table: "user_values",
    catalog: { table: "values", fk: "value_id" },
    noteCol: "why_it_matters",
    evidenceCol: "example_behaviors",
    coreCol: "is_core",
    rankCol: "rank",
    statusCol: "status",
    retiredValue: "retired",
  },
  strengths: {
    table: "user_strengths",
    catalog: { table: "strengths", fk: "strength_id" },
    noteCol: "personal_note",
    evidenceCol: "evidence_note",
    coreCol: "is_signature",
    rankCol: "rank",
    statusCol: "status",
    retiredValue: "retired",
  },
  interests: {
    table: "user_interests",
    catalog: { table: "interests", fk: "interest_id" },
    noteCol: "personal_note",
    coreCol: "is_core",
    rankCol: "rank",
    statusCol: "status",
    retiredValue: "retired",
  },
  beliefs: {
    table: "beliefs",
    textCol: "statement",
    noteCol: "description",
    evidenceCol: "evidence_for",
    coreCol: "is_core",
    rankCol: "rank",
    statusCol: "operating_status",
    retiredValue: "dropped",
  },
  roles: {
    table: "user_roles",
    textCol: "title",
    noteCol: "description",
    evidenceCol: "key_people",
    coreCol: "is_core",
    rankCol: "rank",
    statusCol: "status",
    retiredValue: "retired",
  },
  aspirations: {
    table: "aspirations",
    textCol: "title",
    noteCol: "description",
    evidenceCol: "visualization_note",
    rankCol: "rank",
    statusCol: "operating_status",
    retiredValue: "dropped",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function splitEvidence(value: string | null | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function embeddedName(catalog: unknown): string {
  const row = Array.isArray(catalog) ? catalog[0] : catalog;
  return (row as { name?: string } | null)?.name ?? "";
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function getDiscoverCategories(
  supabase: SupabaseClient,
  userId: string,
): Promise<DiscoverCategory[]> {
  const [values, beliefs, strengths, interests, roles, aspirations] =
    await Promise.all([
      loadValues(supabase, userId),
      loadBeliefs(supabase, userId),
      loadStrengths(supabase, userId),
      loadInterests(supabase, userId),
      loadRoles(supabase, userId),
      loadAspirations(supabase, userId),
    ]);

  const itemsByKey: Record<DiscoverCategoryKey, DiscoverCategory["items"]> = {
    values,
    beliefs,
    strengths,
    interests,
    roles,
    aspirations,
  };

  return discoverCategoryKeys.map((key) => ({
    key,
    name: DISCOVER_CATEGORY_META[key].name,
    color: DISCOVER_CATEGORY_META[key].color,
    items: itemsByKey[key],
  }));
}

async function loadValues(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("user_values")
    .select("id, is_core, rank, why_it_matters, example_behaviors, catalog:values!value_id(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: embeddedName(r.catalog),
    note: (r.why_it_matters as string | null) ?? undefined,
    evidence: splitEvidence(r.example_behaviors as string | null),
    isCore: r.is_core as boolean,
    rank: (r.rank as number | null) ?? null,
  }));
}

async function loadBeliefs(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("beliefs")
    .select("id, statement, description, evidence_for, is_core, rank, operating_status")
    .eq("user_id", userId)
    .eq("operating_status", "active")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: r.statement as string,
    note: (r.description as string | null) ?? undefined,
    evidence: splitEvidence(r.evidence_for as string | null),
    isCore: r.is_core as boolean,
    rank: (r.rank as number | null) ?? null,
  }));
}

async function loadStrengths(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("user_strengths")
    .select(
      "id, is_signature, rank, nature, personal_note, evidence_note, catalog:strengths!strength_id(name)",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: embeddedName(r.catalog),
    note: (r.personal_note as string | null) ?? undefined,
    evidence: splitEvidence(r.evidence_note as string | null),
    isCore: r.is_signature as boolean,
    rank: (r.rank as number | null) ?? null,
    nature: r.nature as "strength" | "growth_area",
  }));
}

async function loadInterests(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("user_interests")
    .select("id, is_core, rank, personal_note, catalog:interests!interest_id(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: embeddedName(r.catalog),
    note: (r.personal_note as string | null) ?? undefined,
    isCore: r.is_core as boolean,
    rank: (r.rank as number | null) ?? null,
  }));
}

async function loadRoles(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("id, title, description, key_people, is_core, rank")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: r.title as string,
    note: (r.description as string | null) ?? undefined,
    evidence: splitEvidence(r.key_people as string | null),
    isCore: r.is_core as boolean,
    rank: (r.rank as number | null) ?? null,
  }));
}

async function loadAspirations(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("aspirations")
    .select(
      "id, title, description, visualization_note, operating_status, lifecycle_status, time_horizon, is_bucket_list, importance_score, rank",
    )
    .eq("user_id", userId)
    .in("operating_status", ["active", "parked"])
    .order("rank", { ascending: true, nullsFirst: false })
    .order("importance_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: r.title as string,
    note: (r.description as string | null) ?? undefined,
    evidence: splitEvidence(r.visualization_note as string | null),
    rank: (r.rank as number | null) ?? null,
    operatingStatus: r.operating_status as "active" | "parked" | "dropped" | "merged",
    lifecycleStatus: r.lifecycle_status as
      | "captured"
      | "exploring"
      | "refined"
      | "converted"
      | "achieved",
    timeHorizon: (r.time_horizon as "short" | "medium" | "long" | "lifetime" | null) ?? null,
    isBucketList: r.is_bucket_list as boolean,
    importanceScore: (r.importance_score as number | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export async function createDiscoverItem(
  supabase: SupabaseClient,
  userId: string,
  category: DiscoverCategoryKey,
  text: string,
): Promise<void> {
  const value = text.trim();
  if (!value) return;
  const cfg = CONFIG[category];

  if (cfg.catalog) {
    const { data: cat, error: catErr } = await supabase
      .from(cfg.catalog.table)
      .insert({ name: value, is_system: false, created_by_user_id: userId })
      .select("id")
      .single();
    if (catErr || !cat) throw catErr ?? new Error("Failed to create catalog row.");
    await supabase
      .from(cfg.table)
      .insert({ user_id: userId, [cfg.catalog.fk]: cat.id });
    return;
  }

  // Fully-ranked lists (aspirations) append the new row at the bottom so the
  // user's existing priority order is preserved.
  if (cfg.rankCol && !cfg.coreCol) {
    const { count } = await supabase
      .from(cfg.table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    await supabase.from(cfg.table).insert({
      user_id: userId,
      [cfg.textCol as string]: value,
      [cfg.rankCol]: (count ?? 0) + 1,
    });
    return;
  }

  await supabase.from(cfg.table).insert({ user_id: userId, [cfg.textCol as string]: value });
}

// ---------------------------------------------------------------------------
// Update text (clone-on-write for shared catalog rows)
// ---------------------------------------------------------------------------
export async function updateDiscoverText(
  supabase: SupabaseClient,
  userId: string,
  category: DiscoverCategoryKey,
  id: string,
  text: string,
): Promise<void> {
  const value = text.trim();
  if (!value) return;
  const cfg = CONFIG[category];

  if (!cfg.catalog) {
    await supabase
      .from(cfg.table)
      .update({ [cfg.textCol as string]: value })
      .eq("id", id)
      .eq("user_id", userId);
    return;
  }

  // Catalog-backed: fetch the linked catalog row's ownership.
  const { data: link } = await supabase
    .from(cfg.table)
    .select(`id, ${cfg.catalog.fk}, catalog:${cfg.catalog.table}!${cfg.catalog.fk}(id, is_system, created_by_user_id)`)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (!link) return;

  const row = link as unknown as Record<string, unknown>;
  const cat = (Array.isArray(row.catalog)
    ? (row.catalog as unknown[])[0]
    : row.catalog) as
    | { id: string; is_system: boolean; created_by_user_id: string | null }
    | null;

  const ownsCatalog = cat && !cat.is_system && cat.created_by_user_id === userId;

  if (ownsCatalog) {
    await supabase.from(cfg.catalog.table).update({ name: value }).eq("id", cat.id);
    return;
  }

  // Clone-on-write: never mutate a shared/system name.
  const { data: clone, error } = await supabase
    .from(cfg.catalog.table)
    .insert({ name: value, is_system: false, created_by_user_id: userId })
    .select("id")
    .single();
  if (error || !clone) throw error ?? new Error("Failed to clone catalog row.");
  await supabase
    .from(cfg.table)
    .update({ [cfg.catalog.fk]: clone.id })
    .eq("id", id)
    .eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Update note / evidence
// ---------------------------------------------------------------------------
export async function updateDiscoverNote(
  supabase: SupabaseClient,
  userId: string,
  category: DiscoverCategoryKey,
  id: string,
  note: string,
): Promise<void> {
  const cfg = CONFIG[category];
  await supabase
    .from(cfg.table)
    .update({ [cfg.noteCol]: note.trim() || null })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function updateDiscoverEvidence(
  supabase: SupabaseClient,
  userId: string,
  category: DiscoverCategoryKey,
  id: string,
  evidence: string[],
): Promise<void> {
  const cfg = CONFIG[category];
  if (!cfg.evidenceCol) return; // interests: no-op
  const joined = evidence.map((e) => e.trim()).filter(Boolean).join("\n");
  await supabase
    .from(cfg.table)
    .update({ [cfg.evidenceCol]: joined || null })
    .eq("id", id)
    .eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Soft delete
// ---------------------------------------------------------------------------
export async function deleteDiscoverItem(
  supabase: SupabaseClient,
  userId: string,
  category: DiscoverCategoryKey,
  id: string,
): Promise<void> {
  const cfg = CONFIG[category];
  await supabase
    .from(cfg.table)
    .update({ [cfg.statusCol]: cfg.retiredValue })
    .eq("id", id)
    .eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Featured/core + rank (values, beliefs, interests, roles)
// ---------------------------------------------------------------------------
async function packRanks(
  supabase: SupabaseClient,
  table: string,
  coreCol: string,
  rankCol: string,
  match: Record<string, unknown>,
): Promise<void> {
  const { data } = await supabase
    .from(table)
    .select(`id, ${rankCol}`)
    .match(match)
    .eq(coreCol, true)
    .order(rankCol, { ascending: true, nullsFirst: false });
  let i = 1;
  for (const row of data ?? []) {
    await supabase.from(table).update({ [rankCol]: i }).eq("id", (row as unknown as { id: string }).id);
    i += 1;
  }
}

export async function setDiscoverCore(
  supabase: SupabaseClient,
  userId: string,
  category: DiscoverCategoryKey,
  id: string,
  isCore: boolean,
): Promise<void> {
  const cfg = CONFIG[category];
  if (!cfg.coreCol || !cfg.rankCol) return;

  const { data: featured } = await supabase
    .from(cfg.table)
    .select("id")
    .eq("user_id", userId)
    .eq(cfg.statusCol, "active")
    .eq(cfg.coreCol, true);
  const count = featured?.length ?? 0;

  if (isCore) {
    if (count >= MAX_CORE) return; // cap reached
    await supabase
      .from(cfg.table)
      .update({ [cfg.coreCol]: true, [cfg.rankCol]: count + 1 })
      .eq("id", id)
      .eq("user_id", userId);
  } else {
    await supabase
      .from(cfg.table)
      .update({ [cfg.coreCol]: false, [cfg.rankCol]: null })
      .eq("id", id)
      .eq("user_id", userId);
    await packRanks(supabase, cfg.table, cfg.coreCol, cfg.rankCol, { user_id: userId });
  }
}

export async function reorderDiscoverRanks(
  supabase: SupabaseClient,
  userId: string,
  category: DiscoverCategoryKey,
  ids: string[],
): Promise<void> {
  const cfg = CONFIG[category];
  if (!cfg.rankCol) return;
  let i = 1;
  for (const id of ids) {
    await supabase
      .from(cfg.table)
      .update({ [cfg.rankCol]: i })
      .eq("id", id)
      .eq("user_id", userId);
    i += 1;
  }
}

// ---------------------------------------------------------------------------
// Strengths featured (two nature groups)
// ---------------------------------------------------------------------------
export async function setStrengthSignature(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  isSignature: boolean,
): Promise<void> {
  const { data: row } = await supabase
    .from("user_strengths")
    .select("id, nature")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (!row) return;
  const nature = row.nature as "strength" | "growth_area";
  const cap = nature === "strength" ? MAX_SIGNATURE_STRENGTHS : MAX_SIGNATURE_GROWTH;

  const { data: featured } = await supabase
    .from("user_strengths")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("nature", nature)
    .eq("is_signature", true);
  const count = featured?.length ?? 0;

  if (isSignature) {
    if (count >= cap) return;
    await supabase
      .from("user_strengths")
      .update({ is_signature: true, rank: count + 1 })
      .eq("id", id)
      .eq("user_id", userId);
  } else {
    await supabase
      .from("user_strengths")
      .update({ is_signature: false, rank: null })
      .eq("id", id)
      .eq("user_id", userId);
    await packRanks(supabase, "user_strengths", "is_signature", "rank", {
      user_id: userId,
      nature,
    });
  }
}

export async function reorderStrengthRanks(
  supabase: SupabaseClient,
  userId: string,
  ids: string[],
): Promise<void> {
  let i = 1;
  for (const id of ids) {
    await supabase
      .from("user_strengths")
      .update({ rank: i })
      .eq("id", id)
      .eq("user_id", userId);
    i += 1;
  }
}

export async function setStrengthNature(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { data: row } = await supabase
    .from("user_strengths")
    .select("id, nature")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (!row) return;
  const oldNature = row.nature as "strength" | "growth_area";
  const newNature = oldNature === "strength" ? "growth_area" : "strength";

  // Moving groups always clears featured status; re-pack the old group.
  await supabase
    .from("user_strengths")
    .update({
      nature: newNature,
      is_signature: false,
      rank: null,
      desired_development: newNature === "strength" ? "leverage_more" : "improve",
    })
    .eq("id", id)
    .eq("user_id", userId);

  await packRanks(supabase, "user_strengths", "is_signature", "rank", {
    user_id: userId,
    nature: oldNature,
  });
}

// ---------------------------------------------------------------------------
// Aspiration meta
// ---------------------------------------------------------------------------
export async function updateAspirationMeta(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: AspirationMetaPatch,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.operatingStatus !== undefined) update.operating_status = patch.operatingStatus;
  if (patch.lifecycleStatus !== undefined) update.lifecycle_status = patch.lifecycleStatus;
  if (patch.timeHorizon !== undefined) update.time_horizon = patch.timeHorizon;
  if (patch.isBucketList !== undefined) update.is_bucket_list = patch.isBucketList;
  if (patch.importanceScore !== undefined) {
    update.importance_score =
      patch.importanceScore === null
        ? null
        : Math.max(0, Math.min(10, patch.importanceScore));
  }

  // Refinement gate: advancing lifecycle on an untyped aspiration derives a type.
  const advancing =
    patch.lifecycleStatus === "refined" ||
    patch.lifecycleStatus === "converted" ||
    patch.lifecycleStatus === "achieved";
  if (advancing) {
    const { data: current } = await supabase
      .from("aspirations")
      .select("aspiration_type")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (current && current.aspiration_type == null) {
      update.aspiration_type = "experience";
      update.type_source = "derived";
      update.type_derived_at = new Date().toISOString();
    }
  }

  if (Object.keys(update).length === 0) return;
  await supabase.from("aspirations").update(update).eq("id", id).eq("user_id", userId);
}
