"use server";

import {
  type ActionDetails,
  type JourneyDetails,
  type StepDetails,
  type SummitDetails,
  actionDetailsSchema,
  journeyDetailsSchema,
  stepDetailsSchema,
  summitDetailsSchema,
} from "@lifeos/contracts";
import { revalidatePath } from "next/cache";
import {
  addAlignChild,
  createSummit,
  deleteAlignItem,
  renameAlignItem,
  requireUser,
  updateActionDetails,
  updateJourneyDetails,
  updateStepDetails,
  updateSummitDetails,
} from "@/server/align";

/**
 * Align server actions. Each resolves the authenticated user, delegates to the
 * server-only data-access layer, then revalidates the route so the RSC
 * re-reads. The client wraps these in a transition + `router.refresh()`.
 */

async function revalidate(): Promise<void> {
  revalidatePath("/align");
}

export async function createSummitAction(
  domainKey: string,
  title: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await createSummit(supabase, userId, domainKey, title);
  await revalidate();
}

export async function addChildAction(parentId: string, title: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await addAlignChild(supabase, userId, parentId, title);
  await revalidate();
}

export async function renameItemAction(id: string, title: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await renameAlignItem(supabase, userId, id, title);
  await revalidate();
}

export async function deleteItemAction(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await deleteAlignItem(supabase, userId, id);
  await revalidate();
}

export async function updateSummitDetailsAction(
  id: string,
  details: SummitDetails,
): Promise<void> {
  const parsed = summitDetailsSchema.parse(details);
  const { supabase, userId } = await requireUser();
  await updateSummitDetails(supabase, userId, id, parsed);
  await revalidate();
}

export async function updateJourneyDetailsAction(
  id: string,
  details: JourneyDetails,
): Promise<void> {
  const parsed = journeyDetailsSchema.parse(details);
  const { supabase, userId } = await requireUser();
  await updateJourneyDetails(supabase, userId, id, parsed);
  await revalidate();
}

export async function updateActionDetailsAction(
  id: string,
  details: ActionDetails,
): Promise<void> {
  const parsed = actionDetailsSchema.parse(details);
  const { supabase, userId } = await requireUser();
  await updateActionDetails(supabase, userId, id, parsed);
  await revalidate();
}

export async function updateStepDetailsAction(
  id: string,
  details: StepDetails,
): Promise<void> {
  const parsed = stepDetailsSchema.parse(details);
  const { supabase, userId } = await requireUser();
  await updateStepDetails(supabase, userId, id, parsed);
  await revalidate();
}
