import { AppHeader } from "@/components/home/app-header";
import { GlanceCard } from "@/components/home/glance-card";
import { LifeWheel } from "@/components/home/life-wheel";
import { TodayLabel } from "@/components/home/today-label";
import { getCurrentProfile } from "@/server/profile";

// Reads the session cookie, so it must render per-request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const user = profile
    ? { name: profile.fullName ?? profile.email, plan: profile.plan }
    : null;

  return (
    <div className="min-h-screen bg-[#f5efe3]">
      <AppHeader user={user} />

      <main className="mx-auto max-w-6xl px-6 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <TodayLabel />
        </div>

        <div className="mt-4 grid items-center gap-10 lg:grid-cols-2">
          <div className="flex justify-center">
            <LifeWheel />
          </div>

          <GlanceCard title="This week, at a glance">
            You&rsquo;ve leaned into Work and Heart &mdash; Body could use a little
            attention.
          </GlanceCard>
        </div>
      </main>
    </div>
  );
}
