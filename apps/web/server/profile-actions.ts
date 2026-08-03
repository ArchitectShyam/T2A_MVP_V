"use server";

import { profileUpdateSchema } from "@lifeos/contracts";
import { createSupabaseAdminClient } from "@lifeos/db/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth.js";

/**
 * Updates the signed-in user's own editable profile fields (name, phone).
 *
 * The `profiles` table has no client-writable RLS policy on purpose (so a user
 * can never escalate their own plan). We therefore write with the service-role
 * client, but strictly scoped to the authenticated user's id and limited to the
 * whitelisted columns — plan/trial are never touched here.
 */
export async function updateProfileAction(
  _prev: { ok: boolean; error?: string },
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You are not signed in." };

  const parsed = profileUpdateSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check your details.",
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { ok: false, error: "Profile updates are not configured on the server." };
  }

  const admin = createSupabaseAdminClient(url, serviceKey);
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone === "" ? null : parsed.data.phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/settings");
  // Send the user back to the home page after a successful save.
  redirect("/");
}
