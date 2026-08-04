import { AppHeader } from "@/components/home/app-header";
import { DiscoverClient } from "@/components/discover/discover-client";
import { getCurrentProfile } from "@/server/profile";
import { getDiscoverCategories, requireUser } from "@/server/discover";

// Reads the session cookie + per-user data, so it must render per-request.
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const { supabase, userId } = await requireUser();
  const [categories, profile] = await Promise.all([
    getDiscoverCategories(supabase, userId),
    getCurrentProfile(),
  ]);

  const user = profile
    ? { name: profile.fullName ?? profile.email, plan: profile.plan }
    : null;

  return (
    <div className="min-h-screen bg-[#f5efe3]">
      <AppHeader user={user} />

      <main className="mx-auto max-w-6xl px-6 pb-10 pt-6">
        <p className="text-xs font-medium tracking-[0.2em] text-[#9C9078]">DISCOVER</p>
        <h1 className="mb-6 font-serif text-3xl text-[#3A342C]">Who you are, so far</h1>

        <DiscoverClient categories={categories} />
      </main>
    </div>
  );
}
