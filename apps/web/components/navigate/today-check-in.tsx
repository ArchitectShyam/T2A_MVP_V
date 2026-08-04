"use client";

import {
  type CheckInContext,
  type NavToday,
  TODAY_AFFIRMATION,
  TODAY_QUOTE,
} from "@lifeos/contracts";
import { Check, Circle } from "lucide-react";
import { useState } from "react";

/**
 * Center hub — the daily check-in / check-out. Check-in plans & commits the
 * day; check-out reflects & closes it. Defaults to check-out once the day is
 * already checked out.
 */

export interface TodayCheckInProps {
  today: NavToday;
  context: CheckInContext[];
  onToggleAction: (id: string, done: boolean) => void;
  onCommit: () => void;
  onCheckout: (summary: string) => void;
}

type Tab = "checkin" | "checkout";

export function TodayCheckIn({
  today,
  context,
  onToggleAction,
  onCommit,
  onCheckout,
}: TodayCheckInProps) {
  const [tab, setTab] = useState<Tab>(today.checkedOut ? "checkout" : "checkin");
  const [summary, setSummary] = useState(today.checkoutSummary ?? "");

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-[#F0EAD9] p-1">
        <TabButton active={tab === "checkin"} onClick={() => setTab("checkin")}>
          Check-in
        </TabButton>
        <TabButton active={tab === "checkout"} onClick={() => setTab("checkout")}>
          Check-out
        </TabButton>
      </div>

      {/* Grounding chips */}
      {context.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {context.map((c) => (
            <span
              key={`${c.label}-${c.title}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E4DAC8] px-2.5 py-1 text-xs text-[#6B5D42]"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-[#9C9078]">{c.label}:</span> {c.title}
            </span>
          ))}
        </div>
      ) : null}

      {tab === "checkin" ? (
        <CheckInTab today={today} onToggleAction={onToggleAction} onCommit={onCommit} />
      ) : (
        <CheckOutTab
          today={today}
          summary={summary}
          setSummary={setSummary}
          onCheckout={onCheckout}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-[#FAF6EF] text-[#3A342C]" : "text-[#9C9078] hover:text-[#6B5D42]"
      }`}
    >
      {children}
    </button>
  );
}

function CheckInTab({
  today,
  onToggleAction,
  onCommit,
}: {
  today: NavToday;
  onToggleAction: (id: string, done: boolean) => void;
  onCommit: () => void;
}) {
  return (
    <div>
      <p className="mb-1 font-serif text-[15px] leading-snug text-[#3A342C]">
        {TODAY_AFFIRMATION}
      </p>
      <p className="mb-4 text-xs italic text-[#9C9078]">{TODAY_QUOTE}</p>

      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9C9078]">
        Today&apos;s focus
      </h3>
      {today.actions.length === 0 ? (
        <p className="text-sm text-[#9C9078]">
          No focus actions yet. Add some from the Actions segment.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {today.actions.map((a) => (
            <li key={a.id} className="flex items-center gap-2.5">
              <button
                type="button"
                aria-label={a.done ? "Mark not done" : "Mark done"}
                onClick={() => onToggleAction(a.id, !a.done)}
                className="shrink-0"
              >
                {a.done ? (
                  <Check className="h-4 w-4 text-[#8A9878]" strokeWidth={2} />
                ) : (
                  <Circle className="h-4 w-4 text-[#C1694B]" strokeWidth={1.75} />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  a.done ? "text-[#9C9078] line-through" : "text-[#3A342C]"
                }`}
              >
                {a.title}
              </span>
              {/* Plain plan-dot: filled = part of today's committed plan. */}
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: a.committed ? "#C1694B" : "transparent",
                  border: a.committed ? "none" : "1px solid #E4DAC8",
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onCommit}
        disabled={today.committed || today.actions.length === 0}
        className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          today.committed
            ? "cursor-default bg-[#F0EAD9] text-[#9C9078]"
            : today.actions.length === 0
              ? "cursor-not-allowed bg-[#F0EAD9] text-[#C4B79C]"
              : "bg-[#C1694B] text-[#FAF6EF] hover:bg-[#a9542f]"
        }`}
      >
        {today.committed ? "Day committed" : "Commit the day"}
      </button>
    </div>
  );
}

function CheckOutTab({
  today,
  summary,
  setSummary,
  onCheckout,
}: {
  today: NavToday;
  summary: string;
  setSummary: (v: string) => void;
  onCheckout: (summary: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9C9078]">
        Close out the day
      </h3>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="How did today go? What did you learn?"
        rows={5}
        className="w-full resize-none rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-3 py-2 text-sm text-[#3A342C] outline-none placeholder:text-[#C4B79C] focus:border-[#C9A24B]"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onCheckout(summary)}
          className="rounded-lg bg-[#C9A24B] px-4 py-2 text-sm font-medium text-[#3A342C] transition-colors hover:bg-[#b78f3a]"
        >
          {today.checkedOut ? "Update check-out" : "Check out"}
        </button>
        {today.checkedOut ? (
          <span className="text-xs text-[#8A9878]">Checked out for today</span>
        ) : null}
      </div>
    </div>
  );
}
