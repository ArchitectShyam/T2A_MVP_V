"use server";

import {
  type IdentityElementType,
  type NavTodayAction,
  type Polarity,
  type ReflectionKind,
  type NudgeResponse,
  type StepDirection,
  type UiSchedule,
  identityElementTypeSchema,
  nudgeResponseSchema,
  polaritySchema,
  reflectionKindSchema,
  stepDirectionSchema,
  uiScheduleSchema,
} from "@lifeos/contracts";
import { revalidatePath } from "next/cache";
import {
  addAdhocRitual,
  addIdentityLink,
  addReflection,
  addRoutineStep,
  addTodayAction,
  checkoutToday,
  commitToday,
  createHabit,
  createRoutine,
  deletePractice,
  deleteRoutineStep,
  deleteTodayAction,
  elevatePractice,
  getActionsForDate,
  removeIdentityLink,
  renameRoutine,
  reorderRoutineStep,
  requireUser,
  setIdentityLinkNote,
  setNudgeResponse,
  setRitualIntention,
  setTodayActionDone,
  unelevatePractice,
  updateHabitPolarity,
  updateHabitSchedule,
} from "@/server/navigate";

/**
 * Navigate server actions. Each resolves the authenticated user, delegates to
 * the server-only data-access layer, then revalidates the route so the RSC
 * re-reads. The client wraps these in a transition + `router.refresh()`.
 * Exception: `getActionsForDateAction` is a read-only lookup (no revalidate).
 */

async function revalidate(): Promise<void> {
  revalidatePath("/navigate");
}

// --- Today / check-in ------------------------------------------------------
export async function addTodayActionAction(actionId: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await addTodayAction(supabase, userId, actionId);
  await revalidate();
}

export async function deleteTodayActionAction(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await deleteTodayAction(supabase, userId, id);
  await revalidate();
}

export async function setTodayActionDoneAction(
  id: string,
  done: boolean,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await setTodayActionDone(supabase, userId, id, done);
  await revalidate();
}

export async function commitTodayAction(): Promise<void> {
  const { supabase, userId } = await requireUser();
  await commitToday(supabase, userId);
  await revalidate();
}

export async function checkoutTodayAction(summary: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await checkoutToday(supabase, userId, summary);
  await revalidate();
}

/** Read-only: returns focus actions for a picked date without revalidating. */
export async function getActionsForDateAction(
  date: string,
): Promise<NavTodayAction[]> {
  const { supabase, userId } = await requireUser();
  return getActionsForDate(supabase, userId, date);
}

// --- Habits ----------------------------------------------------------------
export async function createHabitAction(
  title: string,
  schedule: UiSchedule,
  polarity: Polarity,
): Promise<void> {
  const s = uiScheduleSchema.parse(schedule);
  const p = polaritySchema.parse(polarity);
  const { supabase, userId } = await requireUser();
  await createHabit(supabase, userId, title, s, p);
  await revalidate();
}

export async function updateHabitPolarityAction(
  id: string,
  polarity: Polarity,
): Promise<void> {
  const p = polaritySchema.parse(polarity);
  const { supabase, userId } = await requireUser();
  await updateHabitPolarity(supabase, userId, id, p);
  await revalidate();
}

export async function updateHabitScheduleAction(
  id: string,
  schedule: UiSchedule,
): Promise<void> {
  const s = uiScheduleSchema.parse(schedule);
  const { supabase, userId } = await requireUser();
  await updateHabitSchedule(supabase, userId, id, s);
  await revalidate();
}

export async function deletePracticeAction(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await deletePractice(supabase, userId, id);
  await revalidate();
}

// --- Routines --------------------------------------------------------------
export async function createRoutineAction(name: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await createRoutine(supabase, userId, name);
  await revalidate();
}

export async function renameRoutineAction(id: string, name: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await renameRoutine(supabase, userId, id, name);
  await revalidate();
}

export async function addRoutineStepAction(
  routineId: string,
  title: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await addRoutineStep(supabase, userId, routineId, title);
  await revalidate();
}

export async function deleteRoutineStepAction(stepId: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await deleteRoutineStep(supabase, userId, stepId);
  await revalidate();
}

export async function reorderRoutineStepAction(
  stepId: string,
  direction: StepDirection,
): Promise<void> {
  const d = stepDirectionSchema.parse(direction);
  const { supabase, userId } = await requireUser();
  await reorderRoutineStep(supabase, userId, stepId, d);
  await revalidate();
}

// --- Rituals ---------------------------------------------------------------
export async function elevatePracticeAction(practiceId: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await elevatePractice(supabase, userId, practiceId);
  await revalidate();
}

export async function unelevatePracticeAction(practiceId: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await unelevatePractice(supabase, userId, practiceId);
  await revalidate();
}

export async function addAdhocRitualAction(
  title: string,
  intention: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await addAdhocRitual(supabase, userId, title, intention);
  await revalidate();
}

export async function setRitualIntentionAction(
  practiceId: string,
  intention: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await setRitualIntention(supabase, userId, practiceId, intention);
  await revalidate();
}

export async function addIdentityLinkAction(
  ritualPracticeId: string,
  elementType: IdentityElementType,
  elementId: string,
  elementLabel: string,
): Promise<void> {
  const t = identityElementTypeSchema.parse(elementType);
  const { supabase, userId } = await requireUser();
  await addIdentityLink(supabase, userId, ritualPracticeId, t, elementId, elementLabel);
  await revalidate();
}

export async function removeIdentityLinkAction(linkId: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await removeIdentityLink(supabase, userId, linkId);
  await revalidate();
}

export async function setIdentityLinkNoteAction(
  linkId: string,
  note: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await setIdentityLinkNote(supabase, userId, linkId, note);
  await revalidate();
}

// --- Reflections -----------------------------------------------------------
export async function addReflectionAction(
  kind: ReflectionKind,
  text: string,
  prompt?: string,
): Promise<void> {
  const k = reflectionKindSchema.parse(kind);
  const { supabase, userId } = await requireUser();
  await addReflection(supabase, userId, k, text, prompt ?? null);
  await revalidate();
}

// --- Nudges ----------------------------------------------------------------
export async function setNudgeResponseAction(
  nudgeId: string,
  response: NudgeResponse | null,
): Promise<void> {
  const r = response === null ? null : nudgeResponseSchema.parse(response);
  const { supabase, userId } = await requireUser();
  await setNudgeResponse(supabase, userId, nudgeId, r);
  await revalidate();
}
