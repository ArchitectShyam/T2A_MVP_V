import { Settings } from "lucide-react";
import { AppHeader } from "@/components/home/app-header";
import { GlanceCard } from "@/components/home/glance-card";
import { LifeWheel } from "@/components/home/life-wheel";
import { TodayLabel } from "@/components/home/today-label";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f5efe3]">
      <AppHeader userName="Raj Patel" />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <TodayLabel />
          <button
            type="button"
            aria-label="Dashboard settings"
            className="text-[#8a7d6c] transition-colors hover:text-[#4a4036]"
          >
            <Settings className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-2">
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
