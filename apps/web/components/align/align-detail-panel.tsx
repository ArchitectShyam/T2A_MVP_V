"use client";

import {
  type Summit,
  DIMENSION_META,
  DOMAIN_META,
} from "@lifeos/contracts";
import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { HierarchyNode, type HierarchyHandlers } from "./hierarchy-node";

const HAIRLINE = "#E4DAC8";
const INK = "#3A342C";
const MUTED = "#6B5D42";
const MUTED_LIGHT = "#9C9078";

export type AlignSelection =
  | { type: "none" }
  | { type: "dimension"; dimensionKey: string }
  | { type: "domain"; domainKey: string; dimensionKey: string };

export interface AlignDetailPanelProps {
  selection: AlignSelection;
  summits: Summit[];
  handlers: HierarchyHandlers;
  onCreateSummit: (domainKey: string, title: string) => void;
  onOpenDomain: (domainKey: string, dimensionKey: string) => void;
  onOpenDimension: (dimensionKey: string) => void;
}

export function AlignDetailPanel(props: AlignDetailPanelProps) {
  const { selection } = props;

  return (
    <div
      className="rounded-xl border p-6"
      style={{ borderColor: HAIRLINE, borderWidth: 0.5, backgroundColor: "#FAF6EF" }}
    >
      {selection.type !== "none" ? <Breadcrumb {...props} /> : null}
      {selection.type === "none" ? <NoneState {...props} /> : null}
      {selection.type === "dimension" ? <DimensionState {...props} selection={selection} /> : null}
      {selection.type === "domain" ? <DomainState {...props} selection={selection} /> : null}
    </div>
  );
}

function Breadcrumb({
  selection,
  onOpenDimension,
}: AlignDetailPanelProps) {
  if (selection.type === "none") return null;
  const dim = DIMENSION_META[selection.dimensionKey];
  const dom = selection.type === "domain" ? DOMAIN_META[selection.domainKey] : null;

  return (
    <div className="mb-3 flex items-center gap-1 text-[12px]" style={{ color: MUTED_LIGHT }}>
      {dom ? (
        <button
          type="button"
          onClick={() => onOpenDimension(selection.dimensionKey)}
          className="hover:underline"
          style={{ color: MUTED }}
        >
          {dim?.name ?? selection.dimensionKey}
        </button>
      ) : (
        <span style={{ color: MUTED }}>{dim?.name ?? selection.dimensionKey}</span>
      )}
      {dom ? (
        <>
          <ChevronRight size={13} strokeWidth={1.75} />
          <span style={{ color: INK }}>{dom.name}</span>
        </>
      ) : null}
    </div>
  );
}

function NoneState({ summits, handlers }: AlignDetailPanelProps) {
  const active = summits.filter((s) => s.active);

  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl" style={{ color: INK }}>
        This month&apos;s 3
      </h2>
      <p className="mb-4 text-[13px]" style={{ color: MUTED_LIGHT }}>
        Your active summits for this month.
      </p>
      {active.length ? (
        <div className="divide-y" style={{ borderColor: HAIRLINE }}>
          {active.map((s) => (
            <HierarchyNode key={s.id} item={s} depth={0} handlers={handlers} />
          ))}
        </div>
      ) : (
        <p className="text-[14px]" style={{ color: MUTED_LIGHT }}>
          No active summits yet. Tap a domain on the wheel to add one.
        </p>
      )}
    </div>
  );
}

function DimensionState({
  selection,
  summits,
  onOpenDomain,
}: AlignDetailPanelProps & { selection: { type: "dimension"; dimensionKey: string } }) {
  const dim = DIMENSION_META[selection.dimensionKey];
  if (!dim) return null;

  return (
    <div>
      <h2 className="mb-4 font-serif text-2xl" style={{ color: INK }}>
        {dim.name}
      </h2>
      <div className="grid gap-2">
        {dim.domains.map((dom) => {
          const inDomain = summits.filter((s) => s.domainKey === dom.key);
          const anyActive = inDomain.some((s) => s.active);
          return (
            <button
              key={dom.key}
              type="button"
              onClick={() => onOpenDomain(dom.key, dim.key)}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-[#F0EAD9]"
              style={{ borderColor: HAIRLINE }}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: dom.color }}
              />
              <span className="flex-1 text-[15px]" style={{ color: INK }}>
                {dom.name}
              </span>
              <span className="text-[12px]" style={{ color: MUTED_LIGHT }}>
                {inDomain.length} summit{inDomain.length === 1 ? "" : "s"}
                {anyActive ? " · active" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DomainState({
  selection,
  summits,
  handlers,
  onCreateSummit,
}: AlignDetailPanelProps & {
  selection: { type: "domain"; domainKey: string; dimensionKey: string };
}) {
  const dom = DOMAIN_META[selection.domainKey];
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const domainSummits = summits.filter((s) => s.domainKey === selection.domainKey);

  function submit() {
    const v = title.trim();
    if (v) onCreateSummit(selection.domainKey, v);
    setTitle("");
    setAdding(false);
  }

  if (!dom) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-serif text-2xl" style={{ color: INK }}>
          {dom.name}
        </h2>
        <button
          type="button"
          aria-label="New summit"
          onClick={() => setAdding((a) => !a)}
          className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
          style={{ borderColor: HAIRLINE, color: MUTED }}
        >
          <Plus size={16} strokeWidth={1.75} />
        </button>
        <span className="ml-1 text-[13px]" style={{ color: MUTED_LIGHT }}>
          {domainSummits.length}
        </span>
      </div>

      {adding ? (
        <div className="mb-4 flex gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="Name your summit…"
            className="flex-1 rounded-lg border bg-white px-3 py-2 text-[15px] outline-none"
            style={{ borderColor: HAIRLINE, color: INK }}
          />
          <button
            type="button"
            onClick={submit}
            className="rounded-lg px-4 py-2 text-[14px] font-medium text-[#FAF6EF]"
            style={{ backgroundColor: dom.color }}
          >
            Add
          </button>
        </div>
      ) : null}

      {domainSummits.length ? (
        <div className="divide-y" style={{ borderColor: HAIRLINE }}>
          {domainSummits.map((s) => (
            <HierarchyNode key={s.id} item={s} depth={0} handlers={handlers} />
          ))}
        </div>
      ) : (
        <p className="text-[14px]" style={{ color: MUTED_LIGHT }}>
          No summits here yet. Add your first with the + above.
        </p>
      )}
    </div>
  );
}
