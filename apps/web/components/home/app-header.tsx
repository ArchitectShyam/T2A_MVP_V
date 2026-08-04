import { type Plan } from "@lifeos/contracts";
import { Compass, Eye, Sparkles, Triangle } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "./user-menu";

const NAV = [
  { label: "Discover", Icon: Eye, href: "/discover" },
  { label: "Align", Icon: Triangle, href: null },
  { label: "Navigate", Icon: Compass, href: null },
  { label: "Evolve", Icon: Sparkles, href: null },
] as const;

export interface AppHeaderProps {
  /** The signed-in user, or `null` when not authenticated. */
  user: { name: string; plan: Plan } | null;
}

/** Top navigation shell shown across the authenticated app. */
export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="w-full bg-[#efe7d6]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand mark */}
        <div className="flex items-center">
          <Link
            href="/"
            aria-label="Home"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c1623a] transition-opacity hover:opacity-90"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#fbf8f1]" />
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="hidden items-center gap-9 sm:flex">
          {NAV.map(({ label, Icon, href }) =>
            href ? (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-2 text-[15px] text-[#6f6152] transition-colors hover:text-[#4a4036]"
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {label}
              </Link>
            ) : (
              <button
                key={label}
                type="button"
                className="flex items-center gap-2 text-[15px] text-[#6f6152] transition-colors hover:text-[#4a4036]"
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {label}
              </button>
            ),
          )}
        </nav>

        {/* User + actions */}
        {user ? (
          <UserMenu name={user.name} plan={user.plan} />
        ) : (
          <Link
            href="/login"
            className="text-[15px] font-medium text-[#c1623a] hover:text-[#a9412a]"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
