import { redirect } from "next/navigation";
import { AppHeader } from "@/components/home/app-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { getCurrentProfile } from "@/server/profile";

// Reads the session cookie, so it must render per-request.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const user = { name: profile.fullName ?? profile.email, plan: profile.plan };

  return (
    <div className="min-h-screen bg-[#f5efe3]">
      <AppHeader user={user} />

      <main className="mx-auto max-w-xl px-6 py-8">
        <h1 className="mb-2 font-serif text-3xl text-[#4a4036]">
          Profile settings
        </h1>
        <p className="mb-6 text-[15px] text-[#8a7d6c]">
          Update your name and contact details.
        </p>

        <ProfileForm
          email={profile.email}
          fullName={profile.fullName ?? ""}
          phone={profile.phone ?? ""}
          plan={profile.plan}
        />
      </main>
    </div>
  );
}
