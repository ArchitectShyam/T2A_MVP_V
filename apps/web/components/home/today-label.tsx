"use client";

import { useEffect, useState } from "react";

/**
 * Renders today's date (e.g. "Monday, August 3") on the client so it always
 * reflects the viewer's own locale and timezone rather than build time.
 */
export function TodayLabel() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(
      new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    );
  }, []);

  return (
    <p className="text-[15px] text-[#8a7d6c]" suppressHydrationWarning>
      {label}
    </p>
  );
}
