import { AlignClient } from "@/components/align/align-client";
import { AppHeader } from "@/components/home/app-header";
import { getDomainAlignment, getSummitTree, requireUser } from "@/server/align";
import { getCurrentProfile } from "@/server/profile";

// Reads the session cookie + per-user data, so it must render per-request.
export const dynamic = "force-dynamic";

export default async function AlignPage() {
  const { supabase, userId } = await requireUser();
  const [summits, alignment, profile] = await Promise.all([
    getSummitTree(supabase, userId),
    getDomainAlignment(supabase, userId),
    getCurrentProfile(),
  ]);

  const user = profile
    ? { name: profile.fullName ?? profile.email, plan: profile.plan }
    : null;

  return (
    <div className="min-h-screen bg-[#f5efe3]">
      <AppHeader user={user} />

      <main className="mx-auto max-w-6xl px-6 pb-10 pt-6">
        <p className="text-xs font-medium tracking-[0.2em] text-[#9C9078]">ALIGN</p>
        <h1 className="mb-6 font-serif text-3xl text-[#3A342C]">All your summits</h1>

        <AlignClient summits={summits} alignment={alignment} />
      </main>
    </div>
  );
}
