"use server";

import {
  type AspirationMetaPatch,
  type DiscoverCategoryKey,
} from "@lifeos/contracts";
import { revalidatePath } from "next/cache";
import {
  createDiscoverItem,
  deleteDiscoverItem,
  reorderDiscoverRanks,
  reorderStrengthRanks,
  requireUser,
  setDiscoverCore,
  setStrengthNature,
  setStrengthSignature,
  updateAspirationMeta,
  updateDiscoverEvidence,
  updateDiscoverNote,
  updateDiscoverText,
} from "@/server/discover";

/**
 * Discover server actions. Each resolves the authenticated user, delegates to
 * the server-only data-access layer, then revalidates the route so the RSC
 * re-reads. The client wraps these in a transition + `router.refresh()`.
 */

async function revalidate(): Promise<void> {
  revalidatePath("/discover");
}

export async function addItemAction(
  category: DiscoverCategoryKey,
  text: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await createDiscoverItem(supabase, userId, category, text);
  await revalidate();
}

export async function editTextAction(
  category: DiscoverCategoryKey,
  id: string,
  text: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await updateDiscoverText(supabase, userId, category, id, text);
  await revalidate();
}

export async function editNoteAction(
  category: DiscoverCategoryKey,
  id: string,
  note: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await updateDiscoverNote(supabase, userId, category, id, note);
  await revalidate();
}

export async function editEvidenceAction(
  category: DiscoverCategoryKey,
  id: string,
  evidence: string[],
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await updateDiscoverEvidence(supabase, userId, category, id, evidence);
  await revalidate();
}

export async function deleteItemAction(
  category: DiscoverCategoryKey,
  id: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await deleteDiscoverItem(supabase, userId, category, id);
  await revalidate();
}

export async function setCoreAction(
  category: DiscoverCategoryKey,
  id: string,
  isCore: boolean,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await setDiscoverCore(supabase, userId, category, id, isCore);
  await revalidate();
}

export async function reorderCoreAction(
  category: DiscoverCategoryKey,
  ids: string[],
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await reorderDiscoverRanks(supabase, userId, category, ids);
  await revalidate();
}

export async function setStrengthSignatureAction(
  id: string,
  isSignature: boolean,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await setStrengthSignature(supabase, userId, id, isSignature);
  await revalidate();
}

export async function reorderStrengthRanksAction(ids: string[]): Promise<void> {
  const { supabase, userId } = await requireUser();
  await reorderStrengthRanks(supabase, userId, ids);
  await revalidate();
}

export async function switchStrengthNatureAction(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  await setStrengthNature(supabase, userId, id);
  await revalidate();
}

export async function updateAspirationMetaAction(
  id: string,
  patch: AspirationMetaPatch,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  await updateAspirationMeta(supabase, userId, id, patch);
  await revalidate();
}
