import {
  type CheckInContext,
  type IdentityElementType,
  type NavAlignAction,
  type NavDayCompletion,
  type NavHabit,
  type NavIdentityElement,
  type NavIdentityLink,
  type NavNudge,
  type NavReflection,
  type NavRitual,
  type NavRoutine,
  type NavRoutineStep,
  type NavToday,
  type NavTodayAction,
  type NavActionStep,
  type NavigateData,
  type Polarity,
  type ReflectionKind,
  type NudgeResponse,
  type ScheduleEnum,
  type UiSchedule,
  ADHOC_RITUAL_COLOR,
  DOMAIN_META,
  codeToKey,
  scheduleToUi,
  uiScheduleToEnum,
} from "@lifeos/contracts";
import { createSupabaseServerClient } from "@lifeos/db/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseEnv } from "./env.js";

/**
 * Server-only data access for the Navigate feature (the "Wheel of action").
 * Uses the authenticated Supabase cookie client; RLS scopes every row to the
 * signed-in user. The client imports only transport-safe types from
 * `@lifeos/contracts`.
 *
 * (Supabase REST over HTTPS rather than direct Postgres — this network blocks
 * the Postgres ports, same as Align/Discover.)
 */

type SupabaseClient = ReturnType<typeof createSupabaseServerClient>;
type Row = Record<string, unknown>;

const MUTED_LIGHT = "#9C9078";
const SAGE = "#8A9878";

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
// Date + embed helpers (all local time, UTC-safe)
// ---------------------------------------------------------------------------
function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function todayIso(): string {
  return isoOf(new Date());
}

function nowIso(): string {
  return new Date().toISOString();
}

/** The last 7 calendar dates (oldest first), local time. */
function last7Dates(): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(isoOf(d));
  }
  return out;
}

function embeddedField(rel: unknown, field: string): string {
  const row = Array.isArray(rel) ? rel[0] : rel;
  return (row as Record<string, string> | null)?.[field] ?? "";
}

/** Resolves a domain color from an embedded `domains(code)` relation. */
function domainColor(rel: unknown): string {
  const code = embeddedField(rel, "code");
  if (!code) return MUTED_LIGHT;
  return DOMAIN_META[codeToKey(code)]?.color ?? MUTED_LIGHT;
}

function domainName(rel: unknown): string {
  const code = embeddedField(rel, "code");
  if (!code) return "";
  return DOMAIN_META[codeToKey(code)]?.name ?? "";
}

function asSchedule(rel: unknown): UiSchedule {
  const detail = (rel ?? null) as UiSchedule | null;
  return detail && typeof detail === "object" && "type" in detail
    ? { type: detail.type, value: String(detail.value ?? "") }
    : { type: "recurring", value: "daily" };
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

// ---------------------------------------------------------------------------
// Aggregate loader
// ---------------------------------------------------------------------------
export async function getNavigateData(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavigateData> {
  const [
    habits,
    routines,
    reflections,
    nudges,
    today,
    ritualBundle,
    identityElements,
    weekCompletion,
    reflectionCompletion,
    nudgeCompletion,
    alignActions,
  ] = await Promise.all([
    loadHabits(supabase, userId),
    loadRoutines(supabase, userId),
    loadReflections(supabase, userId),
    loadNudges(supabase, userId),
    getToday(supabase, userId),
    loadRituals(supabase, userId),
    loadIdentityElements(supabase, userId),
    loadActionsCompletion(supabase, userId),
    loadReflectionCompletion(supabase, userId),
    loadNudgeCompletion(supabase, userId),
    loadAlignActions(supabase, userId),
  ]);

  const context = buildContext(habits, routines, ritualBundle);

  return {
    habits,
    routines,
    reflections,
    nudges,
    today,
    rituals: ritualBundle,
    identityElements,
    weekCompletion,
    reflectionCompletion,
    nudgeCompletion,
    alignActions,
    context,
  };
}

function buildContext(
  habits: NavHabit[],
  routines: NavRoutine[],
  rituals: NavRitual[],
): CheckInContext[] {
  const chips: CheckInContext[] = [];
  const habit = habits[0];
  if (habit) chips.push({ title: habit.title, color: habit.domainColor, label: "Habit" });
  const ritual = rituals[0];
  if (ritual) chips.push({ title: ritual.title, color: ritual.color, label: "Ritual" });
  const routine = routines[0];
  if (routine) chips.push({ title: routine.name, color: routine.domainColor, label: "Routine" });
  return chips;
}

// ---------------------------------------------------------------------------
// Ritual membership (which practices are elevated)
// ---------------------------------------------------------------------------
async function loadRitualPracticeIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("ritual_details")
    .select("practice_id")
    .eq("user_id", userId);
  return new Set(((data ?? []) as Row[]).map((r) => r.practice_id as string));
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------
async function loadHabits(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavHabit[]> {
  const [{ data }, ritualIds] = await Promise.all([
    supabase
      .from("practices")
      .select("id, title, polarity, schedule, schedule_detail, domains(code)")
      .eq("user_id", userId)
      .eq("practice_type", "habit")
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    loadRitualPracticeIds(supabase, userId),
  ]);
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    domainColor: domainColor(r.domains),
    domainName: domainName(r.domains),
    schedule: scheduleToUi(
      (r.schedule as ScheduleEnum | null) ?? null,
      asSchedule(r.schedule_detail),
    ),
    isRitual: ritualIds.has(r.id as string),
    polarity: (r.polarity as Polarity) ?? "good",
  }));
}

// ---------------------------------------------------------------------------
// Routines
// ---------------------------------------------------------------------------
async function loadRoutines(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavRoutine[]> {
  const [{ data }, ritualIds] = await Promise.all([
    supabase
      .from("practices")
      .select("id, title, schedule, schedule_detail, domains(code)")
      .eq("user_id", userId)
      .eq("practice_type", "routine")
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    loadRitualPracticeIds(supabase, userId),
  ]);
  const routines = (data ?? []) as Row[];
  const ids = routines.map((r) => r.id as string);

  const stepsByRoutine = new Map<string, NavRoutineStep[]>();
  if (ids.length) {
    const { data: stepRows } = await supabase
      .from("practice_steps")
      .select("id, practice_id, title, sequence, is_optional")
      .in("practice_id", ids)
      .order("sequence", { ascending: true })
      .order("created_at", { ascending: true });
    for (const s of (stepRows ?? []) as Row[]) {
      push(stepsByRoutine, s.practice_id as string, {
        id: s.id as string,
        title: s.title as string,
        sequence: (s.sequence as number) ?? 1,
        isOptional: Boolean(s.is_optional),
      });
    }
  }

  return routines.map((r) => ({
    id: r.id as string,
    name: r.title as string,
    domainColor: domainColor(r.domains),
    schedule: scheduleToUi(
      (r.schedule as ScheduleEnum | null) ?? null,
      asSchedule(r.schedule_detail),
    ),
    isRitual: ritualIds.has(r.id as string),
    steps: stepsByRoutine.get(r.id as string) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Rituals (elevated practices + ad-hoc)
// ---------------------------------------------------------------------------
async function loadRituals(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavRitual[]> {
  const { data } = await supabase
    .from("ritual_details")
    .select(
      "practice_id, intention, marked_ritual_at, practices(id, title, practice_type, domains(code))",
    )
    .eq("user_id", userId)
    .order("marked_ritual_at", { ascending: true });

  const rows = (data ?? []) as Row[];
  const practiceIds = rows.map((r) => r.practice_id as string);

  const linksByRitual = new Map<string, NavIdentityLink[]>();
  if (practiceIds.length) {
    const { data: linkRows } = await supabase
      .from("ritual_identity_links")
      .select("id, ritual_practice_id, element_type, element_id, element_label, note")
      .in("ritual_practice_id", practiceIds)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    for (const l of (linkRows ?? []) as Row[]) {
      push(linksByRitual, l.ritual_practice_id as string, {
        id: l.id as string,
        elementType: l.element_type as IdentityElementType,
        elementId: l.element_id as string,
        elementLabel: l.element_label as string,
        note: (l.note as string | null) ?? null,
      });
    }
  }

  return rows.map((r) => {
    const practice = (Array.isArray(r.practices) ? r.practices[0] : r.practices) as Row | null;
    const isAdhoc = (practice?.practice_type as string) === "ritual";
    const practiceId = r.practice_id as string;
    return {
      id: practiceId,
      practiceId,
      title: (practice?.title as string) ?? "Ritual",
      intention: (r.intention as string | null) ?? null,
      color: isAdhoc ? ADHOC_RITUAL_COLOR : domainColorOr(practice?.domains, SAGE),
      isAdhoc,
      links: linksByRitual.get(practiceId) ?? [],
    } satisfies NavRitual;
  });
}

function domainColorOr(rel: unknown, fallback: string): string {
  const code = embeddedField(rel, "code");
  if (!code) return fallback;
  return DOMAIN_META[codeToKey(code)]?.color ?? fallback;
}

// ---------------------------------------------------------------------------
// Identity elements (Discover-sourced, linkable to rituals)
// ---------------------------------------------------------------------------
async function loadIdentityElements(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavIdentityElement[]> {
  const [values, beliefs, strengths, roles, interests, aspirations] =
    await Promise.all([
      supabase
        .from("user_values")
        .select("id, catalog:values!value_id(name)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("beliefs")
        .select("id, statement")
        .eq("user_id", userId)
        .eq("operating_status", "active"),
      supabase
        .from("user_strengths")
        .select("id, catalog:strengths!strength_id(name)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("user_roles")
        .select("id, title")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("user_interests")
        .select("id, catalog:interests!interest_id(name)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("aspirations")
        .select("id, title")
        .eq("user_id", userId)
        .in("operating_status", ["active", "parked"]),
    ]);

  const out: NavIdentityElement[] = [];
  for (const r of (values.data ?? []) as Row[])
    out.push({ type: "value", id: r.id as string, label: embeddedField(r.catalog, "name") });
  for (const r of (beliefs.data ?? []) as Row[])
    out.push({ type: "belief", id: r.id as string, label: r.statement as string });
  for (const r of (strengths.data ?? []) as Row[])
    out.push({ type: "strength", id: r.id as string, label: embeddedField(r.catalog, "name") });
  for (const r of (roles.data ?? []) as Row[])
    out.push({ type: "role", id: r.id as string, label: r.title as string });
  for (const r of (interests.data ?? []) as Row[])
    out.push({ type: "interest", id: r.id as string, label: embeddedField(r.catalog, "name") });
  for (const r of (aspirations.data ?? []) as Row[])
    out.push({ type: "aspiration", id: r.id as string, label: r.title as string });

  return out.filter((e) => e.label);
}

// ---------------------------------------------------------------------------
// Reflections
// ---------------------------------------------------------------------------
function reflectionKindFromDb(t: string): ReflectionKind {
  return t === "self_initiated" ? "self-initiated" : (t as ReflectionKind);
}

async function loadReflections(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavReflection[]> {
  const { data } = await supabase
    .from("reflections")
    .select("id, entry_date, reflection_type, body, prompt")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    date: r.entry_date as string,
    kind: reflectionKindFromDb(r.reflection_type as string),
    text: r.body as string,
    prompt: (r.prompt as string | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Nudges
// ---------------------------------------------------------------------------
async function loadNudges(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavNudge[]> {
  const { data } = await supabase
    .from("nudges")
    .select("id, title, detail, kind, nudge_date, response, domains(code)")
    .eq("user_id", userId)
    .order("nudge_date", { ascending: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    detail: (r.detail as string | null) ?? null,
    domainColor: domainColor(r.domains),
    date: r.nudge_date as string,
    kindLabel: capitalize((r.kind as string) ?? "insight"),
    response: (r.response as NudgeResponse | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Today (daily log + focus actions + steps)
// ---------------------------------------------------------------------------
interface LogRow {
  id: string;
  committed_at: string | null;
  checked_out_at: string | null;
  checkout_summary: string | null;
}

async function getLog(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<LogRow | null> {
  const { data } = await supabase
    .from("daily_logs")
    .select("id, committed_at, checked_out_at, checkout_summary")
    .eq("user_id", userId)
    .eq("log_date", date)
    .maybeSingle();
  return (data as LogRow | null) ?? null;
}

async function ensureLog(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<LogRow | null> {
  const existing = await getLog(supabase, userId, date);
  if (existing) return existing;
  const { data } = await supabase
    .from("daily_logs")
    .insert({ user_id: userId, log_date: date })
    .select("id, committed_at, checked_out_at, checkout_summary")
    .single();
  return (data as LogRow | null) ?? null;
}

/** Loads steps for the given Align actions, flagging those due on `targetDate`. */
async function loadStepsForActions(
  supabase: SupabaseClient,
  actionIds: string[],
  targetDate: string,
): Promise<Map<string, NavActionStep[]>> {
  const byAction = new Map<string, NavActionStep[]>();
  if (!actionIds.length) return byAction;
  const { data } = await supabase
    .from("steps")
    .select("id, action_id, title, is_done, planned_at")
    .in("action_id", actionIds)
    .order("sequence", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  for (const s of (data ?? []) as Row[]) {
    const plannedRaw = s.planned_at as string | null;
    const plannedDate = plannedRaw ? isoOf(new Date(plannedRaw)) : null;
    push(byAction, s.action_id as string, {
      id: s.id as string,
      title: s.title as string,
      done: Boolean(s.is_done),
      plannedDate,
      dueOnDate: plannedDate === targetDate,
    });
  }
  return byAction;
}

async function loadFocusActions(
  supabase: SupabaseClient,
  userId: string,
  log: LogRow,
  date: string,
): Promise<NavTodayAction[]> {
  const { data } = await supabase
    .from("daily_focus_activities")
    .select("id, title, done, action_id")
    .eq("user_id", userId)
    .eq("daily_log_id", log.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Row[];
  const actionIds = rows
    .map((r) => r.action_id as string | null)
    .filter((v): v is string => Boolean(v));
  const stepsByAction = await loadStepsForActions(supabase, actionIds, date);
  const committed = Boolean(log.committed_at);
  return rows.map((r) => {
    const actionId = (r.action_id as string | null) ?? null;
    return {
      id: r.id as string,
      title: r.title as string,
      done: Boolean(r.done),
      committed,
      actionId,
      steps: actionId ? (stepsByAction.get(actionId) ?? []) : [],
    };
  });
}

export async function getToday(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavToday> {
  const date = todayIso();
  const log = await getLog(supabase, userId, date);
  if (!log) {
    return {
      logId: null,
      date,
      committed: false,
      checkedOut: false,
      checkoutSummary: null,
      actions: [],
    };
  }
  const actions = await loadFocusActions(supabase, userId, log, date);
  return {
    logId: log.id,
    date,
    committed: Boolean(log.committed_at),
    checkedOut: Boolean(log.checked_out_at),
    checkoutSummary: log.checkout_summary,
    actions,
  };
}

/** Read-only focus actions for another day (used by the date picker). */
export async function getActionsForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<NavTodayAction[]> {
  const log = await getLog(supabase, userId, date);
  if (!log) return [];
  return loadFocusActions(supabase, userId, log, date);
}

// ---------------------------------------------------------------------------
// Align actions (pickable focus actions)
// ---------------------------------------------------------------------------
async function loadAlignActions(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavAlignAction[]> {
  const { data } = await supabase
    .from("actions")
    .select("id, title, journeys(summits(title))")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return ((data ?? []) as Row[]).map((r) => {
    const journey = (Array.isArray(r.journeys) ? r.journeys[0] : r.journeys) as Row | null;
    const summit = journey
      ? ((Array.isArray(journey.summits) ? journey.summits[0] : journey.summits) as Row | null)
      : null;
    return {
      id: r.id as string,
      title: r.title as string,
      summitTitle: (summit?.title as string) ?? "",
    };
  });
}

// ---------------------------------------------------------------------------
// 7-day completion bands
// ---------------------------------------------------------------------------
async function loadActionsCompletion(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavDayCompletion[]> {
  const dates = last7Dates();
  const first = dates[0];
  if (!first) return [];
  const { data: logs } = await supabase
    .from("daily_logs")
    .select("id, log_date, checked_out_at")
    .eq("user_id", userId)
    .gte("log_date", first);
  const logRows = (logs ?? []) as Row[];
  const logByDate = new Map<string, { id: string; checkedOut: boolean }>();
  for (const l of logRows)
    logByDate.set(l.log_date as string, {
      id: l.id as string,
      checkedOut: Boolean(l.checked_out_at),
    });

  const logIds = logRows.map((l) => l.id as string);
  const doneByLog = new Map<string, { total: number; done: number }>();
  if (logIds.length) {
    const { data: acts } = await supabase
      .from("daily_focus_activities")
      .select("daily_log_id, done")
      .in("daily_log_id", logIds);
    for (const a of (acts ?? []) as Row[]) {
      const key = a.daily_log_id as string;
      const agg = doneByLog.get(key) ?? { total: 0, done: 0 };
      agg.total += 1;
      if (a.done) agg.done += 1;
      doneByLog.set(key, agg);
    }
  }

  return dates.map((date) => {
    const log = logByDate.get(date);
    if (!log) return { date, completed: false };
    const agg = doneByLog.get(log.id);
    const allDone = Boolean(agg && agg.total > 0 && agg.done === agg.total);
    return { date, completed: log.checkedOut || allDone };
  });
}

async function loadReflectionCompletion(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavDayCompletion[]> {
  const dates = last7Dates();
  const first = dates[0];
  if (!first) return [];
  const { data } = await supabase
    .from("reflections")
    .select("entry_date")
    .eq("user_id", userId)
    .gte("entry_date", first);
  const have = new Set(((data ?? []) as Row[]).map((r) => r.entry_date as string));
  return dates.map((date) => ({ date, completed: have.has(date) }));
}

async function loadNudgeCompletion(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavDayCompletion[]> {
  const dates = last7Dates();
  const first = dates[0];
  if (!first) return [];
  const { data } = await supabase
    .from("nudges")
    .select("nudge_date, response")
    .eq("user_id", userId)
    .gte("nudge_date", first);
  const answered = new Set(
    ((data ?? []) as Row[])
      .filter((r) => r.response != null)
      .map((r) => r.nudge_date as string),
  );
  return dates.map((date) => ({ date, completed: answered.has(date) }));
}

// ===========================================================================
// Mutations
// ===========================================================================

// --- Today / focus actions -------------------------------------------------
export async function addTodayAction(
  supabase: SupabaseClient,
  userId: string,
  actionId: string,
): Promise<void> {
  const date = todayIso();
  const log = await ensureLog(supabase, userId, date);
  if (!log) return;
  const { data: action } = await supabase
    .from("actions")
    .select("title")
    .eq("id", actionId)
    .eq("user_id", userId)
    .maybeSingle();
  const title = ((action as Row | null)?.title as string | undefined)?.trim();
  if (!title) return;
  const { count } = await supabase
    .from("daily_focus_activities")
    .select("id", { count: "exact", head: true })
    .eq("daily_log_id", log.id);
  await supabase.from("daily_focus_activities").insert({
    user_id: userId,
    daily_log_id: log.id,
    action_id: actionId,
    title,
    sort_order: (count ?? 0) + 1,
  });
}

export async function deleteTodayAction(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  await supabase
    .from("daily_focus_activities")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
}

export async function setTodayActionDone(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  done: boolean,
): Promise<void> {
  await supabase
    .from("daily_focus_activities")
    .update({ done })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function commitToday(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const log = await ensureLog(supabase, userId, todayIso());
  if (!log) return;
  await supabase
    .from("daily_logs")
    .update({ committed_at: nowIso(), updated_at: nowIso() })
    .eq("id", log.id)
    .eq("user_id", userId);
}

export async function checkoutToday(
  supabase: SupabaseClient,
  userId: string,
  summary: string,
): Promise<void> {
  const log = await ensureLog(supabase, userId, todayIso());
  if (!log) return;
  await supabase
    .from("daily_logs")
    .update({
      checkout_summary: summary.trim() || null,
      checked_out_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", log.id)
    .eq("user_id", userId);
}

// --- Habits ----------------------------------------------------------------
export async function createHabit(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  schedule: UiSchedule,
  polarity: Polarity,
): Promise<void> {
  const value = title.trim();
  if (!value) return;
  await supabase.from("practices").insert({
    user_id: userId,
    practice_type: "habit",
    title: value,
    polarity,
    schedule: uiScheduleToEnum(schedule),
    schedule_detail: schedule,
  });
}

export async function updateHabitPolarity(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  polarity: Polarity,
): Promise<void> {
  await supabase
    .from("practices")
    .update({ polarity, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function updateHabitSchedule(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  schedule: UiSchedule,
): Promise<void> {
  await supabase
    .from("practices")
    .update({
      schedule: uiScheduleToEnum(schedule),
      schedule_detail: schedule,
      updated_at: nowIso(),
    })
    .eq("id", id)
    .eq("user_id", userId);
}

/** Soft-deletes a practice (habit/routine/ritual). */
export async function deletePractice(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  await supabase
    .from("practices")
    .update({ deleted_at: nowIso() })
    .eq("id", id)
    .eq("user_id", userId);
}

// --- Routines --------------------------------------------------------------
export async function createRoutine(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<void> {
  const value = name.trim();
  if (!value) return;
  await supabase.from("practices").insert({
    user_id: userId,
    practice_type: "routine",
    title: value,
  });
}

export async function renameRoutine(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  name: string,
): Promise<void> {
  const value = name.trim();
  if (!value) return;
  await supabase
    .from("practices")
    .update({ title: value, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", userId);
}

/** Verifies the practice belongs to the user before mutating its steps. */
async function ownsPractice(
  supabase: SupabaseClient,
  userId: string,
  practiceId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("practices")
    .select("id")
    .eq("id", practiceId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function addRoutineStep(
  supabase: SupabaseClient,
  userId: string,
  routineId: string,
  title: string,
): Promise<void> {
  const value = title.trim();
  if (!value) return;
  if (!(await ownsPractice(supabase, userId, routineId))) return;
  const { count } = await supabase
    .from("practice_steps")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", routineId);
  await supabase
    .from("practice_steps")
    .insert({ practice_id: routineId, title: value, sequence: (count ?? 0) + 1 });
}

export async function deleteRoutineStep(
  supabase: SupabaseClient,
  _userId: string,
  stepId: string,
): Promise<void> {
  // RLS enforces parent-practice ownership.
  await supabase.from("practice_steps").delete().eq("id", stepId);
}

/** Swaps a step's sequence with its neighbor in the given direction. */
export async function reorderRoutineStep(
  supabase: SupabaseClient,
  _userId: string,
  stepId: string,
  direction: "up" | "down",
): Promise<void> {
  const { data: step } = await supabase
    .from("practice_steps")
    .select("id, practice_id, sequence")
    .eq("id", stepId)
    .maybeSingle();
  const current = step as Row | null;
  if (!current) return;
  const seq = (current.sequence as number) ?? 1;
  const practiceId = current.practice_id as string;

  const { data: siblings } = await supabase
    .from("practice_steps")
    .select("id, sequence")
    .eq("practice_id", practiceId)
    .order("sequence", { ascending: true });
  const list = (siblings ?? []) as Row[];
  const idx = list.findIndex((s) => (s.id as string) === stepId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  const neighbor = list[swapIdx];
  if (idx < 0 || !neighbor) return;

  await Promise.all([
    supabase
      .from("practice_steps")
      .update({ sequence: (neighbor.sequence as number) ?? 1 })
      .eq("id", stepId),
    supabase.from("practice_steps").update({ sequence: seq }).eq("id", neighbor.id as string),
  ]);
}

// --- Rituals ---------------------------------------------------------------
export async function elevatePractice(
  supabase: SupabaseClient,
  userId: string,
  practiceId: string,
): Promise<void> {
  if (!(await ownsPractice(supabase, userId, practiceId))) return;
  const { data: existing } = await supabase
    .from("ritual_details")
    .select("id")
    .eq("practice_id", practiceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return;
  await supabase
    .from("ritual_details")
    .insert({ user_id: userId, practice_id: practiceId });
}

export async function unelevatePractice(
  supabase: SupabaseClient,
  userId: string,
  practiceId: string,
): Promise<void> {
  await supabase
    .from("ritual_identity_links")
    .delete()
    .eq("ritual_practice_id", practiceId)
    .eq("user_id", userId);
  await supabase
    .from("ritual_details")
    .delete()
    .eq("practice_id", practiceId)
    .eq("user_id", userId);
}

export async function addAdhocRitual(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  intention: string,
): Promise<void> {
  const value = title.trim();
  if (!value) return;
  const { data: practice } = await supabase
    .from("practices")
    .insert({ user_id: userId, practice_type: "ritual", title: value })
    .select("id")
    .single();
  const practiceId = (practice as Row | null)?.id as string | undefined;
  if (!practiceId) return;
  await supabase.from("ritual_details").insert({
    user_id: userId,
    practice_id: practiceId,
    intention: intention.trim() || null,
  });
}

export async function setRitualIntention(
  supabase: SupabaseClient,
  userId: string,
  practiceId: string,
  intention: string,
): Promise<void> {
  await supabase
    .from("ritual_details")
    .update({ intention: intention.trim() || null })
    .eq("practice_id", practiceId)
    .eq("user_id", userId);
}

export async function addIdentityLink(
  supabase: SupabaseClient,
  userId: string,
  ritualPracticeId: string,
  elementType: IdentityElementType,
  elementId: string,
  elementLabel: string,
): Promise<void> {
  const label = elementLabel.trim();
  if (!label) return;
  await supabase.from("ritual_identity_links").insert({
    user_id: userId,
    ritual_practice_id: ritualPracticeId,
    element_type: elementType,
    element_id: elementId,
    element_label: label,
  });
}

export async function removeIdentityLink(
  supabase: SupabaseClient,
  userId: string,
  linkId: string,
): Promise<void> {
  await supabase
    .from("ritual_identity_links")
    .delete()
    .eq("id", linkId)
    .eq("user_id", userId);
}

export async function setIdentityLinkNote(
  supabase: SupabaseClient,
  userId: string,
  linkId: string,
  note: string,
): Promise<void> {
  await supabase
    .from("ritual_identity_links")
    .update({ note: note.trim() || null })
    .eq("id", linkId)
    .eq("user_id", userId);
}

// --- Reflections -----------------------------------------------------------
function reflectionKindToDb(kind: ReflectionKind): string {
  return kind === "self-initiated" ? "self_initiated" : kind;
}

export async function addReflection(
  supabase: SupabaseClient,
  userId: string,
  kind: ReflectionKind,
  text: string,
  prompt: string | null,
): Promise<void> {
  const body = text.trim();
  if (!body) return;
  await supabase.from("reflections").insert({
    user_id: userId,
    reflection_type: reflectionKindToDb(kind),
    depth_trigger: kind === "deep" ? "manual" : null,
    prompt: prompt?.trim() || null,
    body,
    entry_date: todayIso(),
  });
}

// --- Nudges ----------------------------------------------------------------
export async function setNudgeResponse(
  supabase: SupabaseClient,
  userId: string,
  nudgeId: string,
  response: NudgeResponse | null,
): Promise<void> {
  await supabase
    .from("nudges")
    .update({ response })
    .eq("id", nudgeId)
    .eq("user_id", userId);
}
