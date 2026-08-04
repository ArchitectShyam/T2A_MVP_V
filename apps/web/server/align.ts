import {
  type ActionDetails,
  type AlignLevel,
  type DomainAlignment,
  type JourneyDetails,
  type StepDetails,
  type Summit,
  type SummitDetails,
  type HierarchyItem,
  codeToKey,
  keyToCode,
} from "@lifeos/contracts";
import { createSupabaseServerClient } from "@lifeos/db/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseEnv } from "./env.js";

/**
 * Server-only data access for the Align feature ("All your summits"). Uses the
 * authenticated Supabase cookie client; RLS scopes every row to the signed-in
 * user. The client never imports this module — only the transport-safe types
 * from `@lifeos/contracts`.
 *
 * (We use Supabase REST over HTTPS rather than direct Postgres because this
 * network blocks the Postgres ports — same rationale as the Discover feature.)
 */

type SupabaseClient = ReturnType<typeof createSupabaseServerClient>;
type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Auth / client
// ---------------------------------------------------------------------------
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
// Helpers
// ---------------------------------------------------------------------------
function nowIso(): string {
  return new Date().toISOString();
}

/** First-of-month (UTC) as `YYYY-MM-DD`, matching the monthly_summit_slots key. */
function firstOfMonthISO(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function asDate(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

/** timestamptz string -> `YYYY-MM-DDTHH:mm` for a `datetime-local` input. */
function toDateTimeLocal(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  return v.slice(0, 16);
}

/** PostgREST embeds a to-one relation as an object (or 1-element array). */
function embeddedCode(rel: unknown): string {
  const row = Array.isArray(rel) ? rel[0] : rel;
  return (row as { code?: string } | null)?.code ?? "";
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

async function resolveDomainId(
  supabase: SupabaseClient,
  domainKey: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("domains")
    .select("id")
    .eq("code", keyToCode(domainKey))
    .limit(1)
    .maybeSingle();
  return ((data as Row | null)?.id as string | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Loads the full Summit -> Journey -> Action -> Step tree for the user in one
 * round of parallel queries, then assembles it bottom-up with Maps.
 */
export async function getSummitTree(
  supabase: SupabaseClient,
  userId: string,
): Promise<Summit[]> {
  const monthStart = firstOfMonthISO();

  const [summitsRes, journeysRes, actionsRes, stepsRes, slotsRes] =
    await Promise.all([
      supabase
        .from("summits")
        .select("*, domains(code)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("priority", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("journeys")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("sequence", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("actions")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("sequence", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("steps")
        .select("*")
        .order("sequence", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("monthly_summit_slots")
        .select("summit_id")
        .eq("user_id", userId)
        .eq("month_start", monthStart)
        .is("released_at", null),
    ]);

  const summitRows = (summitsRes.data ?? []) as Row[];
  const journeyRows = (journeysRes.data ?? []) as Row[];
  const actionRows = (actionsRes.data ?? []) as Row[];
  const stepRows = (stepsRes.data ?? []) as Row[];
  const slotRows = (slotsRes.data ?? []) as Row[];

  const activeSummitIds = new Set(slotRows.map((r) => r.summit_id as string));

  // Steps grouped by action.
  const stepsByAction = new Map<string, HierarchyItem[]>();
  for (const s of stepRows) {
    push(stepsByAction, s.action_id as string, {
      id: s.id as string,
      title: s.title as string,
      stepDetails: {
        sequence: asNumber(s.sequence),
        plannedAt: toDateTimeLocal(s.planned_at),
        estimatedEffortMinutes: asNumber(s.estimated_effort_minutes),
      },
    });
  }

  // Actions grouped by journey.
  const actionsByJourney = new Map<string, HierarchyItem[]>();
  for (const a of actionRows) {
    const id = a.id as string;
    push(actionsByJourney, a.journey_id as string, {
      id,
      title: a.title as string,
      actionDetails: {
        description: asDate(a.description),
        sequence: asNumber(a.sequence),
        dueDate: asDate(a.due_date),
        estimatedEffort: asNumber(a.estimated_effort),
      },
      children: stepsByAction.get(id) ?? [],
    });
  }

  // Journeys grouped by summit.
  const journeysBySummit = new Map<string, HierarchyItem[]>();
  for (const j of journeyRows) {
    const id = j.id as string;
    push(journeysBySummit, j.summit_id as string, {
      id,
      title: j.title as string,
      journeyDetails: {
        description: asDate(j.description),
        outcome: asDate(j.outcome),
        sequence: asNumber(j.sequence),
        plannedStartDate: asDate(j.planned_start_date),
        targetDate: asDate(j.target_date),
      },
      children: actionsByJourney.get(id) ?? [],
    });
  }

  // Summits (top level).
  return summitRows.map((s) => {
    const id = s.id as string;
    return {
      id,
      title: s.title as string,
      active: activeSummitIds.has(id),
      domainKey: codeToKey(embeddedCode(s.domains)),
      details: {
        description: asDate(s.description),
        successCriteria: asDate(s.definition_of_done),
        plannedStartDate: asDate(s.planned_start_date),
        targetDate: asDate(s.target_date),
        priority: asNumber(s.priority),
      },
      children: journeysBySummit.get(id) ?? [],
    } satisfies Summit;
  });
}

/**
 * Per-domain alignment on a fixed 0..1 scale (score / 10), keeping only the
 * latest period. Returns `{}` when the user has no scores yet.
 */
export async function getDomainAlignment(
  supabase: SupabaseClient,
  userId: string,
): Promise<DomainAlignment> {
  const { data } = await supabase
    .from("domain_alignment_scores")
    .select("alignment_score, period_start, domains(code)")
    .eq("user_id", userId);

  const rows = (data ?? []) as Row[];
  const first = rows[0];
  if (!first) return {};

  const latest = rows.reduce<string>((max, r) => {
    const p = r.period_start as string;
    return p > max ? p : max;
  }, first.period_start as string);

  const out: DomainAlignment = {};
  for (const r of rows) {
    if ((r.period_start as string) !== latest) continue;
    const code = embeddedCode(r.domains);
    if (!code) continue;
    const raw = (asNumber(r.alignment_score) ?? 0) / 10;
    out[codeToKey(code)] = Math.max(0, Math.min(1, raw));
  }
  return out;
}

/** Probes each level and returns the kind of the first table that owns `id`. */
export async function findNodeKind(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<AlignLevel | null> {
  const summit = await supabase
    .from("summits")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (summit.data) return "summit";

  const journey = await supabase
    .from("journeys")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (journey.data) return "journey";

  const action = await supabase
    .from("actions")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (action.data) return "action";

  const step = await supabase.from("steps").select("id").eq("id", id).maybeSingle();
  if (step.data) return "step";

  return null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Resolves the domain, then inserts a new (inactive) summit. */
export async function createSummit(
  supabase: SupabaseClient,
  userId: string,
  domainKey: string,
  title: string,
): Promise<void> {
  const value = title.trim();
  if (!value) return;
  const domainId = await resolveDomainId(supabase, domainKey);
  if (!domainId) return;
  await supabase
    .from("summits")
    .insert({ user_id: userId, domain_id: domainId, title: value });
}

async function countChildren(
  supabase: SupabaseClient,
  userId: string,
  table: string,
  fk: string,
  parentId: string,
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(fk, parentId)
    .eq("user_id", userId)
    .is("deleted_at", null);
  return count ?? 0;
}

/** Infers the child level from the parent and inserts it with auto sequence. */
export async function addAlignChild(
  supabase: SupabaseClient,
  userId: string,
  parentId: string,
  title: string,
): Promise<void> {
  const value = title.trim();
  if (!value) return;
  const kind = await findNodeKind(supabase, userId, parentId);

  if (kind === "summit") {
    const n = await countChildren(supabase, userId, "journeys", "summit_id", parentId);
    await supabase
      .from("journeys")
      .insert({ user_id: userId, summit_id: parentId, title: value, sequence: n + 1 });
  } else if (kind === "journey") {
    const n = await countChildren(supabase, userId, "actions", "journey_id", parentId);
    await supabase
      .from("actions")
      .insert({ user_id: userId, journey_id: parentId, title: value, sequence: n + 1 });
  } else if (kind === "action") {
    const { count } = await supabase
      .from("steps")
      .select("id", { count: "exact", head: true })
      .eq("action_id", parentId);
    await supabase
      .from("steps")
      .insert({ action_id: parentId, title: value, sequence: (count ?? 0) + 1 });
  }
  // Adding under a step is a no-op (steps are leaves).
}

/** Dispatches a title rename to the table that owns `id`. */
export async function renameAlignItem(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  title: string,
): Promise<void> {
  const value = title.trim();
  if (!value) return;
  const kind = await findNodeKind(supabase, userId, id);
  if (!kind) return;

  if (kind === "step") {
    await supabase.from("steps").update({ title: value, updated_at: nowIso() }).eq("id", id);
    return;
  }
  const table = kind === "summit" ? "summits" : kind === "journey" ? "journeys" : "actions";
  await supabase
    .from(table)
    .update({ title: value, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null);
}

export async function updateSummitDetails(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  d: SummitDetails,
): Promise<void> {
  await supabase
    .from("summits")
    .update({
      description: d.description,
      definition_of_done: d.successCriteria,
      planned_start_date: d.plannedStartDate,
      target_date: d.targetDate,
      priority: d.priority,
      updated_at: nowIso(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null);
}

export async function updateJourneyDetails(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  d: JourneyDetails,
): Promise<void> {
  await supabase
    .from("journeys")
    .update({
      description: d.description,
      outcome: d.outcome,
      sequence: d.sequence,
      planned_start_date: d.plannedStartDate,
      target_date: d.targetDate,
      updated_at: nowIso(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null);
}

export async function updateActionDetails(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  d: ActionDetails,
): Promise<void> {
  await supabase
    .from("actions")
    .update({
      description: d.description,
      sequence: d.sequence,
      due_date: d.dueDate,
      estimated_effort: d.estimatedEffort,
      updated_at: nowIso(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null);
}

export async function updateStepDetails(
  supabase: SupabaseClient,
  _userId: string,
  id: string,
  d: StepDetails,
): Promise<void> {
  // Steps have no user_id — scoped by id (RLS enforces parent ownership).
  await supabase
    .from("steps")
    .update({
      sequence: d.sequence,
      planned_at: d.plannedAt,
      estimated_effort_minutes: d.estimatedEffortMinutes,
      updated_at: nowIso(),
    })
    .eq("id", id);
}

// --- Delete (soft for summit/journey/action, hard for step) ----------------
async function hardDeleteSteps(
  supabase: SupabaseClient,
  actionIds: string[],
): Promise<void> {
  if (actionIds.length) await supabase.from("steps").delete().in("action_id", actionIds);
}

async function softDeleteActionsById(
  supabase: SupabaseClient,
  actionIds: string[],
  ts: string,
): Promise<void> {
  if (!actionIds.length) return;
  await hardDeleteSteps(supabase, actionIds);
  await supabase.from("actions").update({ deleted_at: ts }).in("id", actionIds);
}

async function collectActionIds(
  supabase: SupabaseClient,
  userId: string,
  journeyIds: string[],
): Promise<string[]> {
  if (!journeyIds.length) return [];
  const { data } = await supabase
    .from("actions")
    .select("id")
    .in("journey_id", journeyIds)
    .eq("user_id", userId)
    .is("deleted_at", null);
  return ((data ?? []) as Row[]).map((r) => r.id as string);
}

/** Soft-deletes the item and cascades downward; hard-deletes steps. Deleting a
 * summit also releases its monthly focus slots. */
export async function deleteAlignItem(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const kind = await findNodeKind(supabase, userId, id);
  if (!kind) return;
  const ts = nowIso();

  if (kind === "step") {
    await supabase.from("steps").delete().eq("id", id);
    return;
  }

  if (kind === "action") {
    await softDeleteActionsById(supabase, [id], ts);
    return;
  }

  if (kind === "journey") {
    const actionIds = await collectActionIds(supabase, userId, [id]);
    await softDeleteActionsById(supabase, actionIds, ts);
    await supabase.from("journeys").update({ deleted_at: ts }).eq("id", id).eq("user_id", userId);
    return;
  }

  // summit
  const { data: js } = await supabase
    .from("journeys")
    .select("id")
    .eq("summit_id", id)
    .eq("user_id", userId)
    .is("deleted_at", null);
  const journeyIds = ((js ?? []) as Row[]).map((r) => r.id as string);

  const actionIds = await collectActionIds(supabase, userId, journeyIds);
  await softDeleteActionsById(supabase, actionIds, ts);
  if (journeyIds.length) {
    await supabase.from("journeys").update({ deleted_at: ts }).in("id", journeyIds);
  }
  await supabase.from("summits").update({ deleted_at: ts }).eq("id", id).eq("user_id", userId);

  // Release this summit's monthly focus slots.
  await supabase
    .from("monthly_summit_slots")
    .update({ released_at: ts })
    .eq("summit_id", id)
    .eq("user_id", userId)
    .is("released_at", null);
}
