"use client";

import { type Plan, PLAN_LABELS } from "@lifeos/contracts";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export interface UserMenuProps {
  name: string;
  plan: Plan;
}

/** Signed-in user's name, plan badge, and a working sign-out action. */
export function UserMenu({ name, plan }: UserMenuProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await getSupabaseBrowserClient().auth.signOut();
    router.refresh();
    router.push("/login");
  }

  const isPaid = plan !== "free";

  return (
    <div className="flex items-center gap-3 text-[#6f6152]">
      <span className="text-[15px]">{name}</span>
      <span
        className={
          isPaid
            ? "rounded-full bg-[#c1623a] px-2.5 py-0.5 text-xs font-medium text-[#fbf8f1]"
            : "rounded-full bg-[#e7dcc6] px-2.5 py-0.5 text-xs font-medium text-[#6f6152]"
        }
      >
        {PLAN_LABELS[plan]}
      </span>
      <button
        type="button"
        aria-label="Sign out"
        disabled={pending}
        onClick={() => void signOut()}
        className="hover:text-[#4a4036] disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <Link
        href="/settings"
        aria-label="Settings"
        className="hover:text-[#4a4036]"
      >
        <Settings className="h-5 w-5" strokeWidth={1.75} />
      </Link>
    </div>
  );
}
