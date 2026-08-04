"use client";

import type {
  AspirationMetaPatch,
  DiscoverCategory,
  DiscoverItem,
} from "@lifeos/contracts";
import {
  ArrowLeftRight,
  ChevronDown,
  GripVertical,
  Image as ImageIcon,
  Pencil,
  Plus,
  Star,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

const HAIRLINE = "#E4DAC8";
const INK = "#3A342C";
const MUTED = "#6B5D42";
const MUTED_LIGHT = "#9C9078";

export interface DiscoverDetailPanelProps {
  category: (DiscoverCategory & { pending?: boolean }) | null;
  showEvidence?: boolean;
  showCore?: boolean;
  coreCount?: number;
  maxCore?: number;
  showStrengths?: boolean;
  signatureStrengthCount?: number;
  signatureGrowthCount?: number;
  maxSignatureStrengths?: number;
  maxSignatureGrowth?: number;
  showAspirations?: boolean;
  collapseAfter?: number;
  onAddItem: (text: string) => void;
  onEditItem: (id: string, text: string) => void;
  onEditNote: (id: string, note: string) => void;
  onEditEvidence: (id: string, evidence: string[]) => void;
  onDeleteItem: (id: string) => void;
  onToggleCore?: (id: string, next: boolean) => void;
  onReorderCore?: (ids: string[]) => void;
  onSwitchNature?: (id: string) => void;
  onUpdateMeta?: (id: string, patch: AspirationMetaPatch) => void;
}

export function DiscoverDetailPanel(props: DiscoverDetailPanelProps) {
  const { category } = props;

  if (!category) {
    return (
      <div
        className="flex min-h-[320px] items-center justify-center rounded-xl border p-8 text-center"
        style={{ borderColor: HAIRLINE, borderWidth: 0.5 }}
      >
        <p className="max-w-xs text-[15px]" style={{ color: MUTED_LIGHT }}>
          Tap a wedge on the wheel to explore and curate that part of who you are.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-6"
      style={{ borderColor: HAIRLINE, borderWidth: 0.5 }}
    >
      <PanelHeader {...props} category={category} />
      <PanelBody {...props} category={category} />
    </div>
  );
}

function PanelHeader({
  category,
  onAddItem,
}: DiscoverDetailPanelProps & { category: DiscoverCategory }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  function submit() {
    const v = text.trim();
    if (v) onAddItem(v);
    setText("");
    setAdding(false);
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <h2 className="font-serif text-2xl" style={{ color: INK }}>
          {category.name}
        </h2>
        <button
          type="button"
          aria-label={`Add ${category.name}`}
          onClick={() => setAdding((a) => !a)}
          className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
          style={{ borderColor: HAIRLINE, color: MUTED }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <span className="ml-1 text-sm" style={{ color: MUTED_LIGHT }}>
          {category.items.length}
        </span>
      </div>

      {adding ? (
        <div className="mt-3 flex gap-2">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder={`Add a ${category.name.toLowerCase().replace(/s$/, "")}…`}
            className="flex-1 rounded-lg border bg-white px-3 py-2 text-[15px] outline-none"
            style={{ borderColor: HAIRLINE, color: INK }}
          />
          <button
            type="button"
            onClick={submit}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#FAF6EF]"
            style={{ backgroundColor: category.color }}
          >
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PanelBody(props: DiscoverDetailPanelProps & { category: DiscoverCategory }) {
  const { category, showStrengths, showCore, showAspirations } = props;

  if (showStrengths) return <StrengthsBody {...props} category={category} />;
  if (showCore) return <CoreBody {...props} category={category} />;
  if (showAspirations) return <AspirationsBody {...props} category={category} />;

  return (
    <div className="flex flex-col gap-2">
      {category.items.map((item) => (
        <ItemRow key={item.id} {...props} item={item} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Core categories (values / beliefs / interests / roles)
// ---------------------------------------------------------------------------
function CoreBody(props: DiscoverDetailPanelProps & { category: DiscoverCategory }) {
  const { category, coreCount = 0, maxCore = 5, onToggleCore, onReorderCore } = props;
  const [showAll, setShowAll] = useState(false);

  const featured = category.items
    .filter((i) => i.isCore)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const rest = category.items.filter((i) => !i.isCore);
  const noneFeatured = featured.length === 0;

  const [dragIds, setDragIds] = useState<string[] | null>(null);
  const orderedFeatured = dragIds
    ? dragIds
        .map((id) => featured.find((f) => f.id === id))
        .filter((f): f is DiscoverItem => f != null)
    : featured;

  function handleDrop(fromId: string, toId: string) {
    const ids = orderedFeatured.map((f) => f.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = ids.splice(from, 1);
    if (moved === undefined) return;
    ids.splice(to, 0, moved);
    setDragIds(ids);
    onReorderCore?.(ids);
  }

  const atCap = coreCount >= maxCore;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px]" style={{ color: MUTED_LIGHT }}>
        Star up to {maxCore} core {category.name.toLowerCase()}, then drag them to rank (
        {coreCount}/{maxCore} chosen).
      </p>

      <div className="flex flex-col gap-2">
        {(noneFeatured ? category.items : orderedFeatured).map((item) => (
          <ItemRow
            key={item.id}
            {...props}
            item={item}
            draggable={!noneFeatured && item.isCore}
            onDropItem={handleDrop}
            star={{
              on: !!item.isCore,
              color: category.color,
              disabled: !item.isCore && atCap,
              onToggle: () => onToggleCore?.(item.id, !item.isCore),
            }}
          />
        ))}
      </div>

      {!noneFeatured && rest.length > 0 ? (
        <ShowMore
          open={showAll}
          count={rest.length}
          label={category.name.toLowerCase()}
          onToggle={() => setShowAll((s) => !s)}
        />
      ) : null}

      {!noneFeatured && showAll
        ? rest.map((item) => (
            <ItemRow
              key={item.id}
              {...props}
              item={item}
              star={{
                on: false,
                color: category.color,
                disabled: atCap,
                onToggle: () => onToggleCore?.(item.id, true),
              }}
            />
          ))
        : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strengths (two nature groups)
// ---------------------------------------------------------------------------
function StrengthsBody(props: DiscoverDetailPanelProps & { category: DiscoverCategory }) {
  const {
    category,
    signatureStrengthCount = 0,
    signatureGrowthCount = 0,
    maxSignatureStrengths = 3,
    maxSignatureGrowth = 2,
    onToggleCore,
    onReorderCore,
    onSwitchNature,
  } = props;

  const groups = [
    {
      nature: "strength",
      title: "Signature strengths",
      count: signatureStrengthCount,
      cap: maxSignatureStrengths,
    },
    {
      nature: "growth_area",
      title: "Growth areas",
      count: signatureGrowthCount,
      cap: maxSignatureGrowth,
    },
  ] as const;

  const [tab, setTab] = useState<"strength" | "growth_area">("strength");
  const active = groups.find((g) => g.nature === tab) ?? groups[0];

  const items = category.items.filter((i) => i.nature === active.nature);
  const featured = items
    .filter((i) => i.isCore)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const rest = items.filter((i) => !i.isCore);
  const atCap = active.count >= active.cap;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex gap-1 rounded-lg border p-1"
        style={{ borderColor: HAIRLINE, borderWidth: 0.5 }}
        role="tablist"
      >
        {groups.map((g) => {
          const on = g.nature === tab;
          return (
            <button
              key={g.nature}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(g.nature)}
              className="flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
              style={
                on
                  ? { backgroundColor: category.color, color: "#FAF6EF" }
                  : { color: MUTED }
              }
            >
              {g.title}
              <span className="ml-1.5 text-xs" style={{ opacity: 0.85 }}>
                {g.count}/{g.cap}
              </span>
            </button>
          );
        })}
      </div>

      <StrengthGroup
        key={active.nature}
        {...props}
        title={active.title}
        featured={featured}
        rest={rest}
        atCap={atCap}
        onToggle={(id, next) => onToggleCore?.(id, next)}
        onReorder={(ids) => onReorderCore?.(ids)}
        onSwitchNature={(id) => onSwitchNature?.(id)}
      />
    </div>
  );
}

function StrengthGroup(
  props: DiscoverDetailPanelProps & {
    category: DiscoverCategory;
    title: string;
    featured: DiscoverItem[];
    rest: DiscoverItem[];
    atCap: boolean;
    onToggle: (id: string, next: boolean) => void;
    onReorder: (ids: string[]) => void;
    onSwitchNature: (id: string) => void;
  },
) {
  const { category, title, featured, rest, atCap, onToggle, onReorder, onSwitchNature } =
    props;
  const [showAll, setShowAll] = useState(false);
  const [dragIds, setDragIds] = useState<string[] | null>(null);

  const ordered = dragIds
    ? dragIds
        .map((id) => featured.find((f) => f.id === id))
        .filter((f): f is DiscoverItem => f != null)
    : featured;

  function handleDrop(fromId: string, toId: string) {
    const ids = ordered.map((f) => f.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = ids.splice(from, 1);
    if (moved === undefined) return;
    ids.splice(to, 0, moved);
    setDragIds(ids);
    onReorder(ids);
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {ordered.map((item) => (
          <ItemRow
            key={item.id}
            {...props}
            item={item}
            draggable
            onDropItem={handleDrop}
            star={{
              on: true,
              color: category.color,
              disabled: false,
              onToggle: () => onToggle(item.id, false),
            }}
            natureButton={{ onClick: () => onSwitchNature(item.id) }}
          />
        ))}
      </div>

      {rest.length > 0 ? (
        <ShowMore
          open={showAll}
          count={rest.length}
          label={title.toLowerCase()}
          onToggle={() => setShowAll((s) => !s)}
        />
      ) : null}

      {showAll
        ? rest.map((item) => (
            <ItemRow
              key={item.id}
              {...props}
              item={item}
              star={{
                on: false,
                color: category.color,
                disabled: atCap,
                onToggle: () => onToggle(item.id, true),
              }}
              natureButton={{ onClick: () => onSwitchNature(item.id) }}
            />
          ))
        : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aspirations
// ---------------------------------------------------------------------------
function AspirationsBody(
  props: DiscoverDetailPanelProps & { category: DiscoverCategory },
) {
  const { category, collapseAfter = 3, onReorderCore } = props;
  const [showAll, setShowAll] = useState(false);
  const [dragIds, setDragIds] = useState<string[] | null>(null);

  const byRank = [...category.items].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  );
  const ordered = dragIds
    ? dragIds
        .map((id) => byRank.find((i) => i.id === id))
        .filter((i): i is DiscoverItem => i != null)
    : byRank;

  function handleDrop(fromId: string, toId: string) {
    const ids = ordered.map((i) => i.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = ids.splice(from, 1);
    if (moved === undefined) return;
    ids.splice(to, 0, moved);
    setDragIds(ids);
    onReorderCore?.(ids);
  }

  const visible = showAll ? ordered : ordered.slice(0, collapseAfter);
  const hidden = ordered.length - visible.length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px]" style={{ color: MUTED_LIGHT }}>
        Drag to set priority — items higher in the list matter more.
      </p>
      {visible.map((item) => (
        <ItemRow
          key={item.id}
          {...props}
          item={item}
          draggable
          onDropItem={handleDrop}
        />
      ))}
      {hidden > 0 || showAll ? (
        <ShowMore
          open={showAll}
          count={ordered.length - collapseAfter}
          label={category.name.toLowerCase()}
          onToggle={() => setShowAll((s) => !s)}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item row (shared)
// ---------------------------------------------------------------------------
function ItemRow(
  props: DiscoverDetailPanelProps & {
    item: DiscoverItem;
    draggable?: boolean;
    onDropItem?: (fromId: string, toId: string) => void;
    star?: { on: boolean; color: string; disabled: boolean; onToggle: () => void };
    natureButton?: { onClick: () => void };
  },
) {
  const {
    item,
    draggable,
    onDropItem,
    star,
    natureButton,
    showEvidence,
    showAspirations,
    onEditItem,
    onDeleteItem,
  } = props;

  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(item.text);

  function commitRename() {
    const v = nameDraft.trim();
    if (v && v !== item.text) onEditItem(item.id, v);
    setRenaming(false);
  }

  return (
    <div
      className="rounded-xl border bg-white"
      style={{ borderColor: HAIRLINE, borderWidth: 0.5 }}
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
      onDragOver={(e) => draggable && e.preventDefault()}
      onDrop={(e) => {
        if (!draggable) return;
        const from = e.dataTransfer.getData("text/plain");
        onDropItem?.(from, item.id);
      }}
    >
      <div className="flex items-center gap-2 px-3.5 py-3">
        {draggable ? (
          <GripVertical className="h-4 w-4 shrink-0 cursor-grab" color={MUTED_LIGHT} />
        ) : null}

        {star ? (
          <button
            type="button"
            aria-label={star.on ? "Unstar" : "Star"}
            disabled={star.disabled}
            onClick={star.onToggle}
            className="shrink-0 disabled:opacity-30"
          >
            <Star
              className="h-4 w-4"
              color={star.on ? star.color : MUTED_LIGHT}
              fill={star.on ? star.color : "none"}
            />
          </button>
        ) : null}

        {renaming ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="flex-1 rounded border px-2 py-1 text-[15px] outline-none"
            style={{ borderColor: HAIRLINE, color: INK }}
          />
        ) : (
          <span className="flex-1 text-[15px]" style={{ color: INK }}>
            {item.text}
          </span>
        )}

        {/* Collapsed indicators */}
        {!expanded && item.note ? <StickyNote className="h-3.5 w-3.5" color={MUTED_LIGHT} /> : null}
        {!expanded && item.evidence?.length ? (
          <span className="flex items-center gap-0.5 text-xs" style={{ color: MUTED_LIGHT }}>
            <ImageIcon className="h-3.5 w-3.5" />
            {item.evidence.length}
          </span>
        ) : null}

        {natureButton ? (
          <button
            type="button"
            aria-label="Switch nature"
            onClick={natureButton.onClick}
            className="shrink-0"
          >
            <ArrowLeftRight className="h-4 w-4" color={MUTED_LIGHT} />
          </button>
        ) : null}

        <button
          type="button"
          aria-label="Expand"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0"
        >
          <ChevronDown
            className="h-4 w-4 transition-transform"
            color={MUTED_LIGHT}
            style={{ transform: expanded ? "rotate(180deg)" : undefined }}
          />
        </button>
        <button
          type="button"
          aria-label="Rename"
          onClick={() => {
            setNameDraft(item.text);
            setRenaming(true);
          }}
          className="shrink-0"
        >
          <Pencil className="h-4 w-4" color={MUTED_LIGHT} />
        </button>
        <button
          type="button"
          aria-label="Delete"
          onClick={() => onDeleteItem(item.id)}
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4" color={MUTED_LIGHT} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t px-3.5 py-3" style={{ borderColor: HAIRLINE }}>
          {showAspirations ? <AspirationMeta {...props} item={item} /> : null}
          <NoteEditor {...props} item={item} />
          {showEvidence ? <EvidenceEditor {...props} item={item} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function NoteEditor(props: DiscoverDetailPanelProps & { item: DiscoverItem }) {
  const { item, onEditNote } = props;
  const [draft, setDraft] = useState(item.note ?? "");
  const dirty = draft !== (item.note ?? "");
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium" style={{ color: MUTED }}>
        Description
      </label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ borderColor: HAIRLINE, color: INK }}
      />
      {dirty ? (
        <button
          type="button"
          onClick={() => onEditNote(item.id, draft)}
          className="mt-1.5 text-xs font-medium"
          style={{ color: props.category?.color }}
        >
          Save description
        </button>
      ) : null}
    </div>
  );
}

function EvidenceEditor(props: DiscoverDetailPanelProps & { item: DiscoverItem }) {
  const { item, onEditEvidence } = props;
  const evidence = item.evidence ?? [];
  const [text, setText] = useState("");

  function add() {
    const v = text.trim();
    if (!v) return;
    onEditEvidence(item.id, [...evidence, v]);
    setText("");
  }
  function remove(idx: number) {
    onEditEvidence(item.id, evidence.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium" style={{ color: MUTED }}>
        Evidence
      </label>
      <div className="flex flex-col gap-1.5">
        {evidence.map((ev, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded border-l-2 bg-[#FAF6EF] px-2 py-1 text-sm"
            style={{ borderColor: props.category?.color, color: INK }}
          >
            <span>{ev}</span>
            <button type="button" aria-label="Remove evidence" onClick={() => remove(i)}>
              <X className="h-3.5 w-3.5" color={MUTED_LIGHT} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add an example…"
          className="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
          style={{ borderColor: HAIRLINE, color: INK }}
        />
        <button
          type="button"
          aria-label="Add evidence"
          onClick={add}
          className="flex h-8 w-8 items-center justify-center rounded-lg border"
          style={{ borderColor: HAIRLINE, color: MUTED }}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AspirationMeta(props: DiscoverDetailPanelProps & { item: DiscoverItem }) {
  const { item, onUpdateMeta } = props;
  const patch = (p: AspirationMetaPatch) => onUpdateMeta?.(item.id, p);

  const sel =
    "rounded-lg border bg-white px-2 py-1.5 text-sm outline-none";
  const selStyle = { borderColor: HAIRLINE, color: INK };

  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-xs" style={{ color: MUTED }}>
        Importance
        <select
          className={sel}
          style={selStyle}
          value={item.importanceScore ?? ""}
          onChange={(e) =>
            patch({ importanceScore: e.target.value === "" ? null : Number(e.target.value) })
          }
        >
          <option value="">—</option>
          {Array.from({ length: 11 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs" style={{ color: MUTED }}>
        Time horizon
        <select
          className={sel}
          style={selStyle}
          value={item.timeHorizon ?? ""}
          onChange={(e) =>
            patch({
              timeHorizon: e.target.value === "" ? null : (e.target.value as never),
            })
          }
        >
          <option value="">—</option>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
          <option value="lifetime">Lifetime</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs" style={{ color: MUTED }}>
        Lifecycle
        <select
          className={sel}
          style={selStyle}
          value={item.lifecycleStatus ?? "captured"}
          onChange={(e) => patch({ lifecycleStatus: e.target.value as never })}
        >
          <option value="captured">Captured</option>
          <option value="exploring">Exploring</option>
          <option value="refined">Refined</option>
          <option value="converted">Converted</option>
          <option value="achieved">Achieved</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs" style={{ color: MUTED }}>
        Operating
        <select
          className={sel}
          style={selStyle}
          value={item.operatingStatus ?? "active"}
          onChange={(e) => patch({ operatingStatus: e.target.value as never })}
        >
          <option value="active">Active</option>
          <option value="parked">Parked</option>
          <option value="dropped">Dropped</option>
        </select>
      </label>

      <label className="col-span-2 flex items-center gap-2 text-sm" style={{ color: MUTED }}>
        <input
          type="checkbox"
          checked={!!item.isBucketList}
          onChange={(e) => patch({ isBucketList: e.target.checked })}
        />
        Bucket list
      </label>
    </div>
  );
}

function ShowMore({
  open,
  count,
  label,
  onToggle,
}: {
  open: boolean;
  count: number;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mx-auto flex items-center gap-1.5 py-1 text-sm"
      style={{ color: MUTED_LIGHT }}
    >
      <ChevronDown
        className="h-4 w-4 transition-transform"
        style={{ transform: open ? "rotate(180deg)" : undefined }}
      />
      {open ? "Show less" : `Show ${count} more ${label}`}
    </button>
  );
}
