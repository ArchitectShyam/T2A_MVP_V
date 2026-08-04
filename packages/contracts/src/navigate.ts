import { z } from "zod";

/**
 * Navigate — shared contracts for the daily-execution surface (the "Wheel of
 * action"). Transport-safe (plain JSON) types + presentation constants that are
 * the ONLY thing the client bundle imports from the data layer, so server-only
 * DB code never leaks into the browser.
 *
 * Six practice segments ring a rotating wheel; a center hub handles the daily
 * check-in / check-out.
 */

// ---------------------------------------------------------------------------
// Wheel segments (presentation data — safe to import as a value on the client)
// ---------------------------------------------------------------------------
export interface NavSegmentDef {
  key: string;
  name: string;
  color: string;
}

export const NAV_SEGMENTS: NavSegmentDef[] = [
  { key: "today", name: "Actions", color: "#C1694B" },
  { key: "habits", name: "Habits", color: "#D9C7A3" },
  { key: "nudges", name: "Nudges", color: "#C17A8E" },
  { key: "rituals", name: "Rituals", color: "#8A9878" },
  { key: "reflections", name: "Reflections", color: "#C9A24B" },
  { key: "routines", name: "Routines", color: "#8C6A4A" },
];

/** Segments whose wedges render the inner-half 7-day completion bands. */
export const NAV_BAND_SEGMENTS = ["today", "reflections", "nudges"] as const;

export const ADHOC_RITUAL_COLOR = "#A67F9E";

export const TODAY_AFFIRMATION =
  "I move with intention. Small, aligned actions compound into the life I am building.";
export const TODAY_QUOTE =
  "How we spend our days is, of course, how we spend our lives. — Annie Dillard";

// ---------------------------------------------------------------------------
// Schedule mapping — UI shape <-> DB enum + verbatim detail
// ---------------------------------------------------------------------------
export const SCHEDULE_ENUMS = ["daily", "weekdays", "weekly", "custom"] as const;
export type ScheduleEnum = (typeof SCHEDULE_ENUMS)[number];

/** UI representation: recurring cadence or a triggering event, plus free text. */
export interface UiSchedule {
  type: "recurring" | "event";
  value: string;
}

export const uiScheduleSchema = z.object({
  type: z.enum(["recurring", "event"]),
  value: z.string(),
});

/** Maps a UI schedule onto the DB enum; the exact detail is stored verbatim. */
export function uiScheduleToEnum(s: UiSchedule): ScheduleEnum {
  if (s.type === "event") return "custom";
  const v = s.value.trim().toLowerCase();
  if (v === "daily") return "daily";
  if (v === "weekdays") return "weekdays";
  if (v === "weekly") return "weekly";
  return "custom";
}

/** Reconstructs the UI schedule, preferring the verbatim detail JSON. */
export function scheduleToUi(
  enumValue: ScheduleEnum | null,
  detail: UiSchedule | null,
): UiSchedule {
  if (detail && (detail.type === "recurring" || detail.type === "event")) {
    return { type: detail.type, value: detail.value };
  }
  return { type: "recurring", value: enumValue ?? "daily" };
}

// ---------------------------------------------------------------------------
// Enums shared across views
// ---------------------------------------------------------------------------
export const polaritySchema = z.enum(["good", "bad"]);
export type Polarity = z.infer<typeof polaritySchema>;

export const reflectionKindSchema = z.enum(["daily", "deep", "guided", "self-initiated"]);
export type ReflectionKind = z.infer<typeof reflectionKindSchema>;

export const nudgeResponseSchema = z.enum(["up", "neutral", "down"]);
export type NudgeResponse = z.infer<typeof nudgeResponseSchema>;

export const identityElementTypeSchema = z.enum([
  "value",
  "belief",
  "strength",
  "role",
  "interest",
  "aspiration",
]);
export type IdentityElementType = z.infer<typeof identityElementTypeSchema>;

export const stepDirectionSchema = z.enum(["up", "down"]);
export type StepDirection = z.infer<typeof stepDirectionSchema>;

// ---------------------------------------------------------------------------
// View row shapes
// ---------------------------------------------------------------------------
export interface NavActionStep {
  id: string;
  title: string;
  done: boolean;
  plannedDate: string | null;
  dueOnDate: boolean;
}

export interface NavTodayAction {
  id: string;
  title: string;
  done: boolean;
  committed: boolean;
  actionId: string | null;
  steps: NavActionStep[];
}

export interface NavAlignAction {
  id: string;
  title: string;
  summitTitle: string;
}

export interface NavToday {
  logId: string | null;
  date: string;
  committed: boolean;
  checkedOut: boolean;
  checkoutSummary: string | null;
  actions: NavTodayAction[];
}

export interface NavHabit {
  id: string;
  title: string;
  domainColor: string;
  domainName: string;
  schedule: UiSchedule;
  isRitual: boolean;
  polarity: Polarity;
}

export interface NavRoutineStep {
  id: string;
  title: string;
  sequence: number;
  isOptional: boolean;
}

export interface NavRoutine {
  id: string;
  name: string;
  domainColor: string;
  schedule: UiSchedule;
  isRitual: boolean;
  steps: NavRoutineStep[];
}

export interface NavIdentityLink {
  id: string;
  elementType: IdentityElementType;
  elementId: string;
  elementLabel: string;
  note: string | null;
}

export interface NavRitual {
  id: string;
  /** The underlying practice id (elevated) or ad-hoc practice id. */
  practiceId: string;
  title: string;
  intention: string | null;
  color: string;
  isAdhoc: boolean;
  links: NavIdentityLink[];
}

/** Discover-sourced identity elements the user can link to a ritual. */
export interface NavIdentityElement {
  type: IdentityElementType;
  id: string;
  label: string;
}

export interface NavReflection {
  id: string;
  date: string;
  kind: ReflectionKind;
  text: string;
  prompt: string | null;
}

export interface NavNudge {
  id: string;
  title: string;
  detail: string | null;
  domainColor: string;
  date: string;
  kindLabel: string;
  response: NudgeResponse | null;
}

/** Per-day completion booleans that feed the wheel's 7-day bands. */
export interface NavDayCompletion {
  date: string;
  completed: boolean;
}

/** At-a-glance grounding chips shown on the check-in hub. */
export interface CheckInContext {
  title: string;
  color: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Aggregate loader shape
// ---------------------------------------------------------------------------
export interface NavigateData {
  habits: NavHabit[];
  routines: NavRoutine[];
  reflections: NavReflection[];
  nudges: NavNudge[];
  today: NavToday;
  rituals: NavRitual[];
  identityElements: NavIdentityElement[];
  weekCompletion: NavDayCompletion[];
  reflectionCompletion: NavDayCompletion[];
  nudgeCompletion: NavDayCompletion[];
  alignActions: NavAlignAction[];
  context: CheckInContext[];
}
