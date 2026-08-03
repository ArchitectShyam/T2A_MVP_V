import { type Profile, profileSchema } from "@lifeos/contracts";
import { createSupabaseServerClient } from "@lifeos/db/supabase/server";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env.js";

/**
 * Reads the current user's profile (plan, trial expiry, …) from the `profiles`
 * table. RLS ensures only the caller's own row is returned. Returns `null` when
 * unauthenticated or when Supabase is not configured.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const env = getSupabaseEnv();
  if (!env) return null;

  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(env.url, env.anonKey, {
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: () => {},
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, phone, plan, plan_started_at, trial_ends_at, created_at, updated_at",
      )
      .eq("id", user.id)
      .single();

    if (error || !data) return null;

    return profileSchema.parse({
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      plan: data.plan,
      planStartedAt: data.plan_started_at,
      trialEndsAt: data.trial_ends_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch {
    // Misconfigured or unreachable Supabase — treat as signed out.
    return null;
  }
}
