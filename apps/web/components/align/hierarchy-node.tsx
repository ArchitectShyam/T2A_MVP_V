"use client";

import type {
  ActionDetails,
  HierarchyItem,
  JourneyDetails,
  StepDetails,
  SummitDetails,
} from "@lifeos/contracts";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const HAIRLINE = "#E4DAC8";
const MUTED = "#6B5D42";
const MUTED_LIGHT = "#9C9078";

const TEXT_SIZE = [13, 12, 11, 11];
const TEXT_COLOR = ["#3A342C", "#6B5D42", "#6B5D42", "#9C9078"];
const ICON_SIZE = [16, 15, 14, 13];
const CHILD_LABEL = ["Journeys", "Actions", "Steps"];

export interface HierarchyHandlers {
  onAddChild: (parentId: string, title: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onEditDetails: (id: string, details: SummitDetails) => void;
  onEditJourneyDetails: (id: string, details: JourneyDetails) => void;
  onEditActionDetails: (id: string, details: ActionDetails) => void;
  onEditStepDetails: (id: string, details: StepDetails) => void;
}

export interface HierarchyNodeProps {
  item: HierarchyItem;
  depth: number;
  handlers: HierarchyHandlers;
}

export function HierarchyNode({ item, depth, handlers }: HierarchyNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState("");

  const size = TEXT_SIZE[depth] ?? 11;
  const color = TEXT_COLOR[depth] ?? MUTED;
  const icon = ICON_SIZE[depth] ?? 13;
  const hasChildren = depth < 3;
  const childLabel = CHILD_LABEL[depth] ?? "Items";
  const children = item.children ?? [];

  function saveRename() {
    const v = title.trim();
    if (v && v !== item.title) handlers.onEdit(item.id, v);
    setRenaming(false);
  }

  function submitChild() {
    const v = childTitle.trim();
    if (v) handlers.onAddChild(item.id, v);
    setChildTitle("");
    setAddingChild(false);
    setExpanded(true);
  }

  return (
    <div>
      {/* Row */}
      <div className="flex items-center gap-1.5 py-1.5">
        {hasChildren ? (
          <button
            type="button"
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={() => setExpanded((e) => !e)}
            className="flex h-5 w-5 shrink-0 items-center justify-center"
            style={{ color: MUTED_LIGHT }}
          >
            {expanded ? (
              <ChevronDown size={icon} strokeWidth={1.75} />
            ) : (
              <ChevronRight size={icon} strokeWidth={1.75} />
            )}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        {renaming ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") {
                setTitle(item.title);
                setRenaming(false);
              }
            }}
            onBlur={saveRename}
            className="flex-1 rounded-md border bg-white px-2 py-1 outline-none"
            style={{ borderColor: HAIRLINE, color: "#3A342C", fontSize: size }}
          />
        ) : (
          <button
            type="button"
            onClick={() => hasChildren && setExpanded((e) => !e)}
            className="flex-1 truncate text-left"
            style={{ color, fontSize: size }}
          >
            {item.title}
          </button>
        )}

        {depth === 0 && item.active ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: "#F0EAD9", color: MUTED }}
          >
            Active
          </span>
        ) : null}

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          <IconButton label="Details" onClick={() => setShowForm((s) => !s)}>
            <SlidersHorizontal size={14} strokeWidth={1.75} />
          </IconButton>
          <IconButton label="Rename" onClick={() => setRenaming(true)}>
            <Pencil size={14} strokeWidth={1.75} />
          </IconButton>
          {confirmDelete ? (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: MUTED }}>
              Delete?
              <button
                type="button"
                onClick={() => {
                  handlers.onDelete(item.id);
                  setConfirmDelete(false);
                }}
                className="font-medium text-[#C1694B]"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{ color: MUTED_LIGHT }}
              >
                No
              </button>
            </span>
          ) : (
            <IconButton label="Delete" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} strokeWidth={1.75} />
            </IconButton>
          )}
        </div>
      </div>

      {/* Detail form */}
      {showForm ? (
        <div className="mb-2 ml-6">
          <DetailForm
            depth={depth}
            item={item}
            onClose={() => setShowForm(false)}
            handlers={handlers}
          />
        </div>
      ) : null}

      {/* Children */}
      {expanded && hasChildren ? (
        <div className="ml-6 border-l pl-3" style={{ borderColor: HAIRLINE }}>
          <div className="flex items-center gap-2 py-1">
            <span
              className="text-[10px] font-medium uppercase tracking-[0.12em]"
              style={{ color: MUTED_LIGHT }}
            >
              {childLabel}
            </span>
            <button
              type="button"
              aria-label={`Add ${childLabel}`}
              onClick={() => setAddingChild((a) => !a)}
              className="flex h-4 w-4 items-center justify-center rounded-full border"
              style={{ borderColor: HAIRLINE, color: MUTED }}
            >
              <Plus size={11} strokeWidth={2} />
            </button>
          </div>

          {addingChild ? (
            <div className="mb-1 flex gap-2">
              <input
                autoFocus
                value={childTitle}
                onChange={(e) => setChildTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitChild();
                  if (e.key === "Escape") setAddingChild(false);
                }}
                placeholder={`Add a ${childLabel.toLowerCase().replace(/s$/, "")}…`}
                className="flex-1 rounded-md border bg-white px-2 py-1 text-[12px] outline-none"
                style={{ borderColor: HAIRLINE, color: "#3A342C" }}
              />
              <button
                type="button"
                onClick={submitChild}
                className="rounded-md px-3 py-1 text-[12px] font-medium text-[#FAF6EF]"
                style={{ backgroundColor: "#8A9878" }}
              >
                Add
              </button>
            </div>
          ) : null}

          {children.map((child) => (
            <HierarchyNode
              key={child.id}
              item={child}
              depth={depth + 1}
              handlers={handlers}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[#F0EAD9]"
      style={{ color: MUTED_LIGHT }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Detail forms
// ---------------------------------------------------------------------------
const labelCls = "mb-1 block text-[10px] font-medium uppercase tracking-[0.1em]";
const inputCls = "w-full rounded-md border bg-white px-2 py-1 text-[12px] outline-none";
const fieldStyle = { borderColor: HAIRLINE, color: "#3A342C" } as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls} style={{ color: MUTED_LIGHT }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function FormShell({
  onSave,
  onClose,
  children,
}: {
  onSave: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: HAIRLINE, backgroundColor: "#FCFAF4" }}
    >
      <div className="grid gap-2">{children}</div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1 text-[12px]"
          style={{ color: MUTED }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md px-3 py-1 text-[12px] font-medium text-[#FAF6EF]"
          style={{ backgroundColor: "#8A9878" }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function DetailForm({
  depth,
  item,
  onClose,
  handlers,
}: {
  depth: number;
  item: HierarchyItem;
  onClose: () => void;
  handlers: HierarchyHandlers;
}) {
  if (depth === 0)
    return <SummitDetailsForm item={item} onClose={onClose} handlers={handlers} />;
  if (depth === 1)
    return <JourneyDetailsForm item={item} onClose={onClose} handlers={handlers} />;
  if (depth === 2)
    return <ActionDetailsForm item={item} onClose={onClose} handlers={handlers} />;
  return <StepDetailsForm item={item} onClose={onClose} handlers={handlers} />;
}

/** Parses a value to number|null (empty string -> null). */
function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function SummitDetailsForm({
  item,
  onClose,
  handlers,
}: {
  item: HierarchyItem;
  onClose: () => void;
  handlers: HierarchyHandlers;
}) {
  const d = item.details;
  const [description, setDescription] = useState(d?.description ?? "");
  const [successCriteria, setSuccessCriteria] = useState(d?.successCriteria ?? "");
  const [plannedStartDate, setPlannedStartDate] = useState(d?.plannedStartDate ?? "");
  const [targetDate, setTargetDate] = useState(d?.targetDate ?? "");
  const [priority, setPriority] = useState(d?.priority?.toString() ?? "");

  function save() {
    handlers.onEditDetails(item.id, {
      description: description.trim() || null,
      successCriteria: successCriteria.trim() || null,
      plannedStartDate: plannedStartDate || null,
      targetDate: targetDate || null,
      priority: num(priority),
    });
    onClose();
  }

  return (
    <FormShell onSave={save} onClose={onClose}>
      <Field label="Description">
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          style={fieldStyle}
        />
      </Field>
      <Field label="Success criteria">
        <textarea
          rows={2}
          value={successCriteria}
          onChange={(e) => setSuccessCriteria(e.target.value)}
          className={inputCls}
          style={fieldStyle}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Planned start">
          <input
            type="date"
            value={plannedStartDate}
            onChange={(e) => setPlannedStartDate(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
        <Field label="Target date">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
        <Field label="Priority">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </FormShell>
  );
}

function JourneyDetailsForm({
  item,
  onClose,
  handlers,
}: {
  item: HierarchyItem;
  onClose: () => void;
  handlers: HierarchyHandlers;
}) {
  const d = item.journeyDetails;
  const [description, setDescription] = useState(d?.description ?? "");
  const [outcome, setOutcome] = useState(d?.outcome ?? "");
  const [plannedStartDate, setPlannedStartDate] = useState(d?.plannedStartDate ?? "");
  const [targetDate, setTargetDate] = useState(d?.targetDate ?? "");
  const [sequence, setSequence] = useState(d?.sequence?.toString() ?? "");

  function save() {
    handlers.onEditJourneyDetails(item.id, {
      description: description.trim() || null,
      outcome: outcome.trim() || null,
      sequence: num(sequence),
      plannedStartDate: plannedStartDate || null,
      targetDate: targetDate || null,
    });
    onClose();
  }

  return (
    <FormShell onSave={save} onClose={onClose}>
      <Field label="Description">
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          style={fieldStyle}
        />
      </Field>
      <Field label="Outcome">
        <textarea
          rows={2}
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className={inputCls}
          style={fieldStyle}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Planned start">
          <input
            type="date"
            value={plannedStartDate}
            onChange={(e) => setPlannedStartDate(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
        <Field label="Target end">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
        <Field label="Order">
          <input
            type="number"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
      </div>
    </FormShell>
  );
}

function ActionDetailsForm({
  item,
  onClose,
  handlers,
}: {
  item: HierarchyItem;
  onClose: () => void;
  handlers: HierarchyHandlers;
}) {
  const d = item.actionDetails;
  const [description, setDescription] = useState(d?.description ?? "");
  const [dueDate, setDueDate] = useState(d?.dueDate ?? "");
  const [estimatedEffort, setEstimatedEffort] = useState(
    d?.estimatedEffort?.toString() ?? "",
  );
  const [sequence, setSequence] = useState(d?.sequence?.toString() ?? "");

  function save() {
    handlers.onEditActionDetails(item.id, {
      description: description.trim() || null,
      sequence: num(sequence),
      dueDate: dueDate || null,
      estimatedEffort: num(estimatedEffort),
    });
    onClose();
  }

  return (
    <FormShell onSave={save} onClose={onClose}>
      <Field label="Description">
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          style={fieldStyle}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Due date">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
        <Field label="Est. effort">
          <input
            type="number"
            value={estimatedEffort}
            onChange={(e) => setEstimatedEffort(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
        <Field label="Order">
          <input
            type="number"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
      </div>
    </FormShell>
  );
}

function StepDetailsForm({
  item,
  onClose,
  handlers,
}: {
  item: HierarchyItem;
  onClose: () => void;
  handlers: HierarchyHandlers;
}) {
  const d = item.stepDetails;
  const [plannedAt, setPlannedAt] = useState(d?.plannedAt ?? "");
  const [estimatedEffortMinutes, setEstimatedEffortMinutes] = useState(
    d?.estimatedEffortMinutes?.toString() ?? "",
  );
  const [sequence, setSequence] = useState(d?.sequence?.toString() ?? "");

  function save() {
    handlers.onEditStepDetails(item.id, {
      sequence: num(sequence),
      plannedAt: plannedAt || null,
      estimatedEffortMinutes: num(estimatedEffortMinutes),
    });
    onClose();
  }

  return (
    <FormShell onSave={save} onClose={onClose}>
      <Field label="Planned date & time">
        <input
          type="datetime-local"
          value={plannedAt}
          onChange={(e) => setPlannedAt(e.target.value)}
          className={inputCls}
          style={fieldStyle}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Est. effort (min)">
          <input
            type="number"
            value={estimatedEffortMinutes}
            onChange={(e) => setEstimatedEffortMinutes(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
        <Field label="Order">
          <input
            type="number"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </Field>
      </div>
    </FormShell>
  );
}
