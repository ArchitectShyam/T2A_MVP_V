"use client";

import type {
  IdentityElementType,
  NavAlignAction,
  NavHabit,
  NavIdentityElement,
  NavNudge,
  NavReflection,
  NavRitual,
  NavRoutine,
  NavToday,
  NavTodayAction,
  NudgeResponse,
  Polarity,
  ReflectionKind,
  StepDirection,
  UiSchedule,
} from "@lifeos/contracts";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Flag,
  Minus,
  Pencil,
  Plus,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Shared handlers
// ---------------------------------------------------------------------------
export interface NavViewHandlers {
  onAddTodayAction: (actionId: string) => void;
  onDeleteTodayAction: (id: string) => void;
  onToggleTodayAction: (id: string, done: boolean) => void;
  fetchActionsForDate: (date: string) => Promise<NavTodayAction[]>;

  onCreateHabit: (title: string, schedule: UiSchedule, polarity: Polarity) => void;
  onUpdateHabitPolarity: (id: string, polarity: Polarity) => void;
  onUpdateHabitSchedule: (id: string, schedule: UiSchedule) => void;
  onDeletePractice: (id: string) => void;

  onCreateRoutine: (name: string) => void;
  onRenameRoutine: (id: string, name: string) => void;
  onAddRoutineStep: (routineId: string, title: string) => void;
  onDeleteRoutineStep: (stepId: string) => void;
  onReorderRoutineStep: (stepId: string, dir: StepDirection) => void;

  onElevatePractice: (practiceId: string) => void;
  onUnelevatePractice: (practiceId: string) => void;
  onAddAdhocRitual: (title: string, intention: string) => void;
  onSetRitualIntention: (practiceId: string, intention: string) => void;
  onAddIdentityLink: (
    ritualPracticeId: string,
    type: IdentityElementType,
    id: string,
    label: string,
  ) => void;
  onRemoveIdentityLink: (linkId: string) => void;
  onSetIdentityLinkNote: (linkId: string, note: string) => void;

  onAddReflection: (kind: ReflectionKind, text: string, prompt?: string) => void;

  onSetNudgeResponse: (nudgeId: string, response: NudgeResponse | null) => void;
}

// ---------------------------------------------------------------------------
// Shared UI atoms
// ---------------------------------------------------------------------------
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-xl text-[#3A342C]">{children}</h2>;
}

function IconBtn({
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
      className="text-[#9C9078] transition-colors hover:text-[#6B5D42]"
    >
      {children}
    </button>
  );
}

function PrimaryBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-[#C1694B] px-3 py-1.5 text-sm font-medium text-[#FAF6EF] transition-colors hover:bg-[#a9542f] disabled:cursor-not-allowed disabled:bg-[#E4DAC8] disabled:text-[#9C9078]"
    >
      {children}
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEnter?: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) onEnter();
      }}
      className="w-full rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-3 py-1.5 text-sm text-[#3A342C] outline-none placeholder:text-[#C4B79C] focus:border-[#C1694B]"
    />
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#9C9078]">{children}</p>;
}

/** A single-field inline add row (input + button). */
function InlineAdd({
  placeholder,
  cta,
  onAdd,
}: {
  placeholder: string;
  cta: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  function submit() {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue("");
  }
  return (
    <div className="flex items-center gap-2">
      <TextInput value={value} onChange={setValue} placeholder={placeholder} onEnter={submit} />
      <PrimaryBtn onClick={submit} disabled={!value.trim()}>
        {cta}
      </PrimaryBtn>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E4DAC8] bg-[#FAF6EF] p-3">{children}</div>
  );
}

function scheduleLabel(s: UiSchedule): string {
  return s.value || (s.type === "event" ? "event-based" : "daily");
}

// ===========================================================================
// 1. Actions view
// ===========================================================================
export function ActionsView({
  today,
  alignActions,
  handlers,
}: {
  today: NavToday;
  alignActions: NavAlignAction[];
  handlers: NavViewHandlers;
}) {
  const [viewDate, setViewDate] = useState(today.date);
  const [showPicker, setShowPicker] = useState(false);
  const [otherActions, setOtherActions] = useState<NavTodayAction[]>([]);
  const isToday = viewDate === today.date;
  const actions = isToday ? today.actions : otherActions;

  useEffect(() => {
    if (isToday) return;
    let active = true;
    handlers.fetchActionsForDate(viewDate).then((rows) => {
      if (active) setOtherActions(rows);
    });
    return () => {
      active = false;
    };
  }, [viewDate, isToday, handlers]);

  const heading = isToday
    ? "Today's actions"
    : new Date(`${viewDate}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

  const [pickId, setPickId] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionTitle>{heading}</SectionTitle>
        <button
          type="button"
          onClick={() => setShowPicker((s) => !s)}
          className="text-xs text-[#9C9078] underline-offset-2 hover:underline"
        >
          {isToday ? "View another day" : "Back to today"}
        </button>
      </div>

      {showPicker ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={viewDate}
            max={today.date}
            onChange={(e) => setViewDate(e.target.value || today.date)}
            className="rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-3 py-1.5 text-sm text-[#3A342C] outline-none focus:border-[#C1694B]"
          />
          {!isToday ? (
            <button
              type="button"
              onClick={() => setViewDate(today.date)}
              className="text-xs text-[#9C9078] hover:text-[#6B5D42]"
            >
              Reset
            </button>
          ) : null}
        </div>
      ) : null}

      {actions.length === 0 ? (
        <EmptyNote>
          {isToday
            ? "No focus actions yet. Pick from your Align actions below."
            : "No focus actions were logged for this day."}
        </EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {actions.map((a) => (
            <li key={a.id}>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label={a.done ? "Mark not done" : "Mark done"}
                  disabled={!isToday}
                  onClick={() => handlers.onToggleTodayAction(a.id, !a.done)}
                  className={isToday ? "shrink-0" : "shrink-0 cursor-default"}
                >
                  {a.done ? (
                    <CheckCircle2 className="h-4 w-4 text-[#8A9878]" strokeWidth={2} />
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
                {isToday ? (
                  <IconBtn label="Remove" onClick={() => handlers.onDeleteTodayAction(a.id)}>
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </IconBtn>
                ) : null}
              </div>

              {a.steps.length > 0 ? (
                <ul className="ml-6 mt-1 flex flex-col gap-1">
                  {a.steps.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1"
                      style={
                        s.dueOnDate
                          ? {
                              backgroundColor: "rgba(193,105,75,0.08)",
                              border: "0.5px solid #C1694B",
                            }
                          : undefined
                      }
                    >
                      {s.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#8A9878]" strokeWidth={2} />
                      ) : (
                        <Circle
                          className="h-3.5 w-3.5"
                          strokeWidth={1.75}
                          style={{ color: s.dueOnDate ? "#C1694B" : "#9C9078" }}
                        />
                      )}
                      <span
                        className={`flex-1 text-xs ${
                          s.done ? "text-[#9C9078] line-through" : "text-[#3A342C]"
                        }`}
                      >
                        {s.title}
                      </span>
                      {s.dueOnDate ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-[#C1694B]">
                          <Flag className="h-3 w-3" strokeWidth={2} />
                          Due
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {isToday ? (
        <div className="flex items-center gap-2 border-t border-[#E4DAC8] pt-3">
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="w-full rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-3 py-1.5 text-sm text-[#3A342C] outline-none focus:border-[#C1694B]"
          >
            <option value="">Add a focus action from Align…</option>
            {alignActions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.summitTitle ? `${a.summitTitle} — ${a.title}` : a.title}
              </option>
            ))}
          </select>
          <PrimaryBtn
            onClick={() => {
              if (pickId) {
                handlers.onAddTodayAction(pickId);
                setPickId("");
              }
            }}
            disabled={!pickId}
          >
            Add
          </PrimaryBtn>
        </div>
      ) : null}
    </div>
  );
}

// ===========================================================================
// 2. Habits view
// ===========================================================================
export function HabitsView({
  habits,
  handlers,
}: {
  habits: NavHabit[];
  handlers: NavViewHandlers;
}) {
  const [title, setTitle] = useState("");
  const [schedType, setSchedType] = useState<"recurring" | "event">("recurring");
  const [schedValue, setSchedValue] = useState("daily");
  const [polarity, setPolarity] = useState<Polarity>("good");

  function create() {
    const v = title.trim();
    if (!v) return;
    handlers.onCreateHabit(v, { type: schedType, value: schedValue.trim() || "daily" }, polarity);
    setTitle("");
    setSchedValue("daily");
    setSchedType("recurring");
    setPolarity("good");
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Habits</SectionTitle>

      {habits.length === 0 ? (
        <EmptyNote>No habits yet. Add your first below.</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((h) => (
            <li key={h.id}>
              <Card>
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: h.domainColor }}
                  />
                  <span className="flex-1 text-sm text-[#3A342C]">{h.title}</span>
                  {h.isRitual ? (
                    <Star className="h-3.5 w-3.5 text-[#C9A24B]" strokeWidth={2} />
                  ) : null}
                  <PolarityToggle
                    value={h.polarity}
                    onChange={(p) => handlers.onUpdateHabitPolarity(h.id, p)}
                  />
                  <IconBtn label="Delete" onClick={() => handlers.onDeletePractice(h.id)}>
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </IconBtn>
                </div>
                <HabitScheduleRow
                  schedule={h.schedule}
                  onChange={(s) => handlers.onUpdateHabitSchedule(h.id, s)}
                  onElevate={
                    h.isRitual
                      ? () => handlers.onUnelevatePractice(h.id)
                      : () => handlers.onElevatePractice(h.id)
                  }
                  isRitual={h.isRitual}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Create */}
      <div className="flex flex-col gap-2 border-t border-[#E4DAC8] pt-3">
        <TextInput value={title} onChange={setTitle} placeholder="New habit…" onEnter={create} />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={schedType}
            onChange={(e) => setSchedType(e.target.value as "recurring" | "event")}
            className="rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-2 py-1.5 text-sm text-[#3A342C] outline-none"
          >
            <option value="recurring">Recurring</option>
            <option value="event">Event</option>
          </select>
          <input
            value={schedValue}
            onChange={(e) => setSchedValue(e.target.value)}
            placeholder={schedType === "recurring" ? "daily / weekdays / weekly" : "after coffee…"}
            className="flex-1 rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-3 py-1.5 text-sm text-[#3A342C] outline-none placeholder:text-[#C4B79C] focus:border-[#C1694B]"
          />
          <PolarityToggle value={polarity} onChange={setPolarity} />
          <PrimaryBtn onClick={create} disabled={!title.trim()}>
            Add
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function PolarityToggle({
  value,
  onChange,
}: {
  value: Polarity;
  onChange: (p: Polarity) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-[#E4DAC8] text-xs">
      <button
        type="button"
        onClick={() => onChange("good")}
        className={`px-2 py-0.5 ${
          value === "good" ? "bg-[#8A9878] text-[#FAF6EF]" : "text-[#9C9078]"
        }`}
      >
        Good
      </button>
      <button
        type="button"
        onClick={() => onChange("bad")}
        className={`px-2 py-0.5 ${
          value === "bad" ? "bg-[#C1694B] text-[#FAF6EF]" : "text-[#9C9078]"
        }`}
      >
        Bad
      </button>
    </div>
  );
}

function HabitScheduleRow({
  schedule,
  onChange,
  onElevate,
  isRitual,
}: {
  schedule: UiSchedule;
  onChange: (s: UiSchedule) => void;
  onElevate: () => void;
  isRitual: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(schedule.type);
  const [value, setValue] = useState(schedule.value);

  if (!editing) {
    return (
      <div className="mt-1.5 flex items-center gap-3 pl-5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-[#9C9078] hover:text-[#6B5D42]"
        >
          {schedule.type === "event" ? "When: " : "Every: "}
          {scheduleLabel(schedule)}
        </button>
        <button
          type="button"
          onClick={onElevate}
          className="text-xs text-[#C9A24B] hover:underline"
        >
          {isRitual ? "Remove ritual" : "Make ritual"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-5">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as "recurring" | "event")}
        className="rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-2 py-1 text-xs text-[#3A342C] outline-none"
      >
        <option value="recurring">Recurring</option>
        <option value="event">Event</option>
      </select>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-2 py-1 text-xs text-[#3A342C] outline-none focus:border-[#C1694B]"
      />
      <button
        type="button"
        onClick={() => {
          onChange({ type, value: value.trim() || "daily" });
          setEditing(false);
        }}
        className="rounded-md bg-[#C1694B] px-2 py-1 text-xs text-[#FAF6EF]"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-[#9C9078]"
      >
        Cancel
      </button>
    </div>
  );
}

// ===========================================================================
// 3. Routines view
// ===========================================================================
export function RoutinesView({
  routines,
  handlers,
}: {
  routines: NavRoutine[];
  handlers: NavViewHandlers;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Routines</SectionTitle>

      {routines.length === 0 ? (
        <EmptyNote>No routines yet. Create one below.</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-3">
          {routines.map((r) => (
            <li key={r.id}>
              <RoutineCard routine={r} handlers={handlers} />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-[#E4DAC8] pt-3">
        <InlineAdd placeholder="New routine…" cta="Add" onAdd={handlers.onCreateRoutine} />
      </div>
    </div>
  );
}

function RoutineCard({
  routine,
  handlers,
}: {
  routine: NavRoutine;
  handlers: NavViewHandlers;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(routine.name);

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: routine.domainColor }}
        />
        {renaming ? (
          <div className="flex flex-1 items-center gap-2">
            <TextInput value={name} onChange={setName} onEnter={() => {
              handlers.onRenameRoutine(routine.id, name);
              setRenaming(false);
            }} />
            <button
              type="button"
              onClick={() => {
                handlers.onRenameRoutine(routine.id, name);
                setRenaming(false);
              }}
              className="rounded-md bg-[#C1694B] px-2 py-1 text-xs text-[#FAF6EF]"
            >
              Save
            </button>
          </div>
        ) : (
          <span className="flex-1 text-sm text-[#3A342C]">{routine.name}</span>
        )}
        {routine.isRitual ? (
          <Star className="h-3.5 w-3.5 text-[#C9A24B]" strokeWidth={2} />
        ) : null}
        <IconBtn label="Rename" onClick={() => setRenaming((s) => !s)}>
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
        </IconBtn>
        <IconBtn
          label={routine.isRitual ? "Remove ritual" : "Make ritual"}
          onClick={() =>
            routine.isRitual
              ? handlers.onUnelevatePractice(routine.id)
              : handlers.onElevatePractice(routine.id)
          }
        >
          <Star
            className="h-4 w-4"
            strokeWidth={1.75}
            style={{ color: routine.isRitual ? "#C9A24B" : "#9C9078" }}
          />
        </IconBtn>
        <IconBtn label="Delete" onClick={() => handlers.onDeletePractice(routine.id)}>
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </IconBtn>
      </div>

      {/* Steps */}
      <ol className="ml-5 mt-2 flex flex-col gap-1">
        {routine.steps.map((s, idx) => (
          <li key={s.id} className="flex items-center gap-2 text-sm text-[#3A342C]">
            <span className="w-4 text-xs text-[#9C9078]">{idx + 1}.</span>
            <span className="flex-1">{s.title}</span>
            <IconBtn
              label="Move up"
              onClick={() => handlers.onReorderRoutineStep(s.id, "up")}
            >
              <ChevronUp className="h-4 w-4" strokeWidth={1.75} />
            </IconBtn>
            <IconBtn
              label="Move down"
              onClick={() => handlers.onReorderRoutineStep(s.id, "down")}
            >
              <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
            </IconBtn>
            <IconBtn label="Delete step" onClick={() => handlers.onDeleteRoutineStep(s.id)}>
              <X className="h-4 w-4" strokeWidth={1.75} />
            </IconBtn>
          </li>
        ))}
      </ol>

      <div className="ml-5 mt-2">
        <InlineAdd
          placeholder="Add a step…"
          cta="Add"
          onAdd={(v) => handlers.onAddRoutineStep(routine.id, v)}
        />
      </div>
    </Card>
  );
}

// ===========================================================================
// 4. Rituals view
// ===========================================================================
export function RitualsView({
  rituals,
  identityElements,
  handlers,
}: {
  rituals: NavRitual[];
  identityElements: NavIdentityElement[];
  handlers: NavViewHandlers;
}) {
  const [title, setTitle] = useState("");
  const [intention, setIntention] = useState("");

  function createAdhoc() {
    const v = title.trim();
    if (!v) return;
    handlers.onAddAdhocRitual(v, intention.trim());
    setTitle("");
    setIntention("");
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Rituals</SectionTitle>

      {rituals.length === 0 ? (
        <EmptyNote>
          No rituals yet. Elevate a habit or routine, or add an ad-hoc ritual below.
        </EmptyNote>
      ) : (
        <ul className="flex flex-col gap-3">
          {rituals.map((r) => (
            <li key={r.id}>
              <RitualCard
                ritual={r}
                identityElements={identityElements}
                handlers={handlers}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-[#E4DAC8] pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[#9C9078]">
          New ad-hoc ritual
        </p>
        <TextInput value={title} onChange={setTitle} placeholder="Ritual name…" />
        <div className="flex items-center gap-2">
          <TextInput value={intention} onChange={setIntention} placeholder="Intention (optional)…" />
          <PrimaryBtn onClick={createAdhoc} disabled={!title.trim()}>
            Add
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function RitualCard({
  ritual,
  identityElements,
  handlers,
}: {
  ritual: NavRitual;
  identityElements: NavIdentityElement[];
  handlers: NavViewHandlers;
}) {
  const [intention, setIntention] = useState(ritual.intention ?? "");
  const [pick, setPick] = useState("");

  const linkedIds = new Set(ritual.links.map((l) => `${l.elementType}:${l.elementId}`));
  const available = identityElements.filter(
    (e) => !linkedIds.has(`${e.type}:${e.id}`),
  );

  function addLink() {
    if (!pick) return;
    const [type, id] = pick.split("::");
    const el = identityElements.find((e) => e.type === type && e.id === id);
    if (!el) return;
    handlers.onAddIdentityLink(ritual.practiceId, el.type, el.id, el.label);
    setPick("");
  }

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: ritual.color }}
        />
        <span className="flex-1 text-sm text-[#3A342C]">{ritual.title}</span>
        {ritual.isAdhoc ? (
          <span className="rounded-full bg-[#F0EAD9] px-2 py-0.5 text-[10px] text-[#9C9078]">
            Ad-hoc
          </span>
        ) : null}
        <IconBtn
          label={ritual.isAdhoc ? "Delete" : "Remove ritual"}
          onClick={() =>
            ritual.isAdhoc
              ? handlers.onDeletePractice(ritual.practiceId)
              : handlers.onUnelevatePractice(ritual.practiceId)
          }
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </IconBtn>
      </div>

      {/* Intention */}
      <div className="ml-5 mt-2 flex items-center gap-2">
        <input
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          onBlur={() => {
            if (intention !== (ritual.intention ?? "")) {
              handlers.onSetRitualIntention(ritual.practiceId, intention);
            }
          }}
          placeholder="Set an intention…"
          className="flex-1 rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-2 py-1 text-xs text-[#3A342C] outline-none focus:border-[#8A9878]"
        />
      </div>

      {/* Identity links */}
      {ritual.links.length > 0 ? (
        <div className="ml-5 mt-2 flex flex-wrap gap-1.5">
          {ritual.links.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-full border border-[#E4DAC8] bg-[#F0EAD9] px-2 py-0.5 text-[11px] text-[#6B5D42]"
            >
              <span className="text-[#9C9078]">{l.elementType}:</span>
              {l.elementLabel}
              <button
                type="button"
                aria-label="Remove link"
                onClick={() => handlers.onRemoveIdentityLink(l.id)}
                className="text-[#9C9078] hover:text-[#C1694B]"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Add link */}
      {available.length > 0 ? (
        <div className="ml-5 mt-2 flex items-center gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="flex-1 rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-2 py-1 text-xs text-[#3A342C] outline-none focus:border-[#8A9878]"
          >
            <option value="">Link an identity element…</option>
            {available.map((e) => (
              <option key={`${e.type}::${e.id}`} value={`${e.type}::${e.id}`}>
                {e.type} — {e.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addLink}
            disabled={!pick}
            className="rounded-md bg-[#8A9878] px-2 py-1 text-xs text-[#FAF6EF] disabled:bg-[#E4DAC8] disabled:text-[#9C9078]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </Card>
  );
}

// ===========================================================================
// 5. Reflections view
// ===========================================================================
const REFLECTION_KINDS: ReflectionKind[] = ["daily", "deep", "guided", "self-initiated"];

export function ReflectionsView({
  reflections,
  handlers,
}: {
  reflections: NavReflection[];
  handlers: NavViewHandlers;
}) {
  const [kind, setKind] = useState<ReflectionKind>("daily");
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");

  function add() {
    const v = text.trim();
    if (!v) return;
    handlers.onAddReflection(kind, v, prompt.trim() || undefined);
    setText("");
    setPrompt("");
    setKind("daily");
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Reflections</SectionTitle>

      {reflections.length === 0 ? (
        <EmptyNote>No reflections yet. Write your first below.</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {reflections.map((r) => (
            <li key={r.id}>
              <Card>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-[#F0EAD9] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#9C9078]">
                    {r.kind}
                  </span>
                  <span className="text-xs text-[#9C9078]">{r.date}</span>
                </div>
                {r.prompt ? (
                  <p className="mb-1 text-xs italic text-[#9C9078]">{r.prompt}</p>
                ) : null}
                <p className="whitespace-pre-wrap text-sm text-[#3A342C]">{r.text}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-[#E4DAC8] pt-3">
        <div className="flex items-center gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ReflectionKind)}
            className="rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-2 py-1.5 text-sm text-[#3A342C] outline-none"
          >
            {REFLECTION_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt (optional)…"
            className="flex-1 rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-3 py-1.5 text-sm text-[#3A342C] outline-none placeholder:text-[#C4B79C] focus:border-[#C9A24B]"
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your reflection…"
          rows={3}
          className="w-full resize-none rounded-lg border border-[#E4DAC8] bg-[#FAF6EF] px-3 py-2 text-sm text-[#3A342C] outline-none placeholder:text-[#C4B79C] focus:border-[#C9A24B]"
        />
        <div>
          <PrimaryBtn onClick={add} disabled={!text.trim()}>
            Add reflection
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// 6. Nudges view (read-only content + thumbs response)
// ===========================================================================
export function NudgesView({
  nudges,
  handlers,
}: {
  nudges: NavNudge[];
  handlers: NavViewHandlers;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Nudges</SectionTitle>

      {nudges.length === 0 ? (
        <EmptyNote>No nudges right now. Check back later.</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {nudges.map((n) => (
            <li key={n.id}>
              <Card>
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: n.domainColor }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#3A342C]">{n.title}</span>
                      <span className="rounded-full bg-[#F0EAD9] px-2 py-0.5 text-[10px] text-[#9C9078]">
                        {n.kindLabel}
                      </span>
                    </div>
                    {n.detail ? (
                      <p className="mt-0.5 text-xs text-[#6B5D42]">{n.detail}</p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-[#9C9078]">{n.date}</p>
                  </div>
                  <ThumbsRow
                    value={n.response}
                    onSet={(r) => handlers.onSetNudgeResponse(n.id, r)}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ThumbsRow({
  value,
  onSet,
}: {
  value: NudgeResponse | null;
  onSet: (r: NudgeResponse | null) => void;
}) {
  function toggle(r: NudgeResponse) {
    onSet(value === r ? null : r);
  }
  const base = "rounded-md p-1 transition-colors";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Helpful"
        onClick={() => toggle("up")}
        className={`${base} ${value === "up" ? "text-[#8A9878]" : "text-[#C4B79C] hover:text-[#9C9078]"}`}
      >
        <ThumbsUp className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label="Neutral"
        onClick={() => toggle("neutral")}
        className={`${base} ${value === "neutral" ? "text-[#C9A24B]" : "text-[#C4B79C] hover:text-[#9C9078]"}`}
      >
        <Minus className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label="Not helpful"
        onClick={() => toggle("down")}
        className={`${base} ${value === "down" ? "text-[#C1694B]" : "text-[#C4B79C] hover:text-[#9C9078]"}`}
      >
        <ThumbsDown className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
