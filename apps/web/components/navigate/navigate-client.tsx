"use client";

import {
  type IdentityElementType,
  type NavigateData,
  type NavDayCompletion,
  type NudgeResponse,
  type Polarity,
  type ReflectionKind,
  type StepDirection,
  type UiSchedule,
  NAV_SEGMENTS,
} from "@lifeos/contracts";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  addAdhocRitualAction,
  addIdentityLinkAction,
  addReflectionAction,
  addRoutineStepAction,
  addTodayActionAction,
  checkoutTodayAction,
  commitTodayAction,
  createHabitAction,
  createRoutineAction,
  deletePracticeAction,
  deleteRoutineStepAction,
  deleteTodayActionAction,
  elevatePracticeAction,
  getActionsForDateAction,
  removeIdentityLinkAction,
  renameRoutineAction,
  reorderRoutineStepAction,
  setIdentityLinkNoteAction,
  setNudgeResponseAction,
  setRitualIntentionAction,
  setTodayActionDoneAction,
  unelevatePracticeAction,
  updateHabitPolarityAction,
  updateHabitScheduleAction,
} from "@/app/navigate/actions";
import { TodayCheckIn } from "./today-check-in";
import {
  ActionsView,
  HabitsView,
  NudgesView,
  ReflectionsView,
  RitualsView,
  RoutinesView,
  type NavViewHandlers,
} from "./navigate-views";
import { WheelOfAction } from "./wheel-of-action";

export interface NavigateClientProps {
  data: NavigateData;
}

export function NavigateClient({ data }: NavigateClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [centerActive, setCenterActive] = useState(false);

  function run(action: Promise<void>) {
    startTransition(async () => {
      await action;
      router.refresh();
    });
  }

  const handlers: NavViewHandlers = {
    onAddTodayAction: (actionId) => run(addTodayActionAction(actionId)),
    onDeleteTodayAction: (id) => run(deleteTodayActionAction(id)),
    onToggleTodayAction: (id, done) => run(setTodayActionDoneAction(id, done)),
    fetchActionsForDate: (date) => getActionsForDateAction(date),

    onCreateHabit: (title, schedule: UiSchedule, polarity: Polarity) =>
      run(createHabitAction(title, schedule, polarity)),
    onUpdateHabitPolarity: (id, polarity: Polarity) =>
      run(updateHabitPolarityAction(id, polarity)),
    onUpdateHabitSchedule: (id, schedule: UiSchedule) =>
      run(updateHabitScheduleAction(id, schedule)),
    onDeletePractice: (id) => run(deletePracticeAction(id)),

    onCreateRoutine: (name) => run(createRoutineAction(name)),
    onRenameRoutine: (id, name) => run(renameRoutineAction(id, name)),
    onAddRoutineStep: (routineId, title) => run(addRoutineStepAction(routineId, title)),
    onDeleteRoutineStep: (stepId) => run(deleteRoutineStepAction(stepId)),
    onReorderRoutineStep: (stepId, dir: StepDirection) =>
      run(reorderRoutineStepAction(stepId, dir)),

    onElevatePractice: (practiceId) => run(elevatePracticeAction(practiceId)),
    onUnelevatePractice: (practiceId) => run(unelevatePracticeAction(practiceId)),
    onAddAdhocRitual: (title, intention) => run(addAdhocRitualAction(title, intention)),
    onSetRitualIntention: (practiceId, intention) =>
      run(setRitualIntentionAction(practiceId, intention)),
    onAddIdentityLink: (
      ritualPracticeId,
      type: IdentityElementType,
      id,
      label,
    ) => run(addIdentityLinkAction(ritualPracticeId, type, id, label)),
    onRemoveIdentityLink: (linkId) => run(removeIdentityLinkAction(linkId)),
    onSetIdentityLinkNote: (linkId, note) => run(setIdentityLinkNoteAction(linkId, note)),

    onAddReflection: (kind: ReflectionKind, text, prompt) =>
      run(addReflectionAction(kind, text, prompt)),

    onSetNudgeResponse: (nudgeId, response: NudgeResponse | null) =>
      run(setNudgeResponseAction(nudgeId, response)),
  };

  const bands: Record<string, NavDayCompletion[]> = {
    today: data.weekCompletion,
    reflections: data.reflectionCompletion,
    nudges: data.nudgeCompletion,
  };

  const activeKey = NAV_SEGMENTS[selected]?.key ?? "today";

  return (
    <div className="flex flex-col items-start gap-11 lg:flex-row">
      <div className="flex w-full shrink-0 justify-center lg:w-2/5 lg:max-w-[40%] lg:justify-start">
        <WheelOfAction
          segments={NAV_SEGMENTS}
          selectedIndex={selected}
          bands={bands}
          onSelect={(index) => {
            setCenterActive(false);
            setSelected(index);
          }}
          onCenterClick={() => setCenterActive(true)}
        />
      </div>

      <div
        className="w-full flex-1 rounded-xl border-[0.5px] border-[#E4DAC8] bg-[#FAF6EF] px-5 py-[18px]"
        style={{ minHeight: 240, marginTop: 48 }}
      >
        {centerActive ? (
          <TodayCheckIn
            today={data.today}
            context={data.context}
            onToggleAction={(id, done) => run(setTodayActionDoneAction(id, done))}
            onCommit={() => run(commitTodayAction())}
            onCheckout={(summary) => run(checkoutTodayAction(summary))}
          />
        ) : activeKey === "today" ? (
          <ActionsView today={data.today} alignActions={data.alignActions} handlers={handlers} />
        ) : activeKey === "habits" ? (
          <HabitsView habits={data.habits} handlers={handlers} />
        ) : activeKey === "nudges" ? (
          <NudgesView nudges={data.nudges} handlers={handlers} />
        ) : activeKey === "rituals" ? (
          <RitualsView
            rituals={data.rituals}
            identityElements={data.identityElements}
            handlers={handlers}
          />
        ) : activeKey === "reflections" ? (
          <ReflectionsView reflections={data.reflections} handlers={handlers} />
        ) : (
          <RoutinesView routines={data.routines} handlers={handlers} />
        )}
      </div>
    </div>
  );
}
