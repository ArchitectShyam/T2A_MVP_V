export interface GlanceCardProps {
  title: string;
  children: React.ReactNode;
}

/** A soft, card-styled summary panel used on the home dashboard. */
export function GlanceCard({ title, children }: GlanceCardProps) {
  return (
    <div className="rounded-2xl border border-[#eadfca] bg-[#fbf8f1] p-7 shadow-[0_1px_2px_rgba(74,64,54,0.04)]">
      <h2 className="font-serif text-2xl text-[#4a4036]">{title}</h2>
      <div className="mt-3 text-[15px] leading-relaxed text-[#6f6152]">{children}</div>
    </div>
  );
}
