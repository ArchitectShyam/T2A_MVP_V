import { Compass, Eye, LogOut, Settings, Sparkles, Triangle } from "lucide-react";

const NAV = [
  { label: "Discover", Icon: Eye },
  { label: "Align", Icon: Triangle },
  { label: "Navigate", Icon: Compass },
  { label: "Evolve", Icon: Sparkles },
] as const;

export interface AppHeaderProps {
  userName: string;
}

/** Top navigation shell shown across the authenticated app. */
export function AppHeader({ userName }: AppHeaderProps) {
  return (
    <header className="w-full bg-[#efe7d6]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand mark */}
        <div className="flex items-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c1623a]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#fbf8f1]" />
          </span>
        </div>

        {/* Primary nav */}
        <nav className="hidden items-center gap-9 sm:flex">
          {NAV.map(({ label, Icon }) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-2 text-[15px] text-[#6f6152] transition-colors hover:text-[#4a4036]"
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </nav>

        {/* User + actions */}
        <div className="flex items-center gap-4 text-[#6f6152]">
          <span className="text-[15px]">{userName}</span>
          <button type="button" aria-label="Sign out" className="hover:text-[#4a4036]">
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button type="button" aria-label="Settings" className="hover:text-[#4a4036]">
            <Settings className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
