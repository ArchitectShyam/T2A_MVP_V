"use client";

import {
  type ActionDetails,
  type DomainAlignment,
  type JourneyDetails,
  type StepDetails,
  type Summit,
  type SummitDetails,
  DOMAIN_META,
} from "@lifeos/contracts";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  addChildAction,
  createSummitAction,
  deleteItemAction,
  renameItemAction,
  updateActionDetailsAction,
  updateJourneyDetailsAction,
  updateStepDetailsAction,
  updateSummitDetailsAction,
} from "@/app/align/actions";
import {
  AlignDetailPanel,
  type AlignSelection,
} from "./align-detail-panel";
import { WheelOfLife, type WheelEncoding } from "./wheel-of-life";
import type { HierarchyHandlers } from "./hierarchy-node";

export interface AlignClientProps {
  summits: Summit[];
  alignment: DomainAlignment;
}

export function AlignClient({ summits, alignment }: AlignClientProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<AlignSelection>({ type: "none" });

  function run(action: Promise<void>) {
    startTransition(async () => {
      await action;
      router.refresh();
    });
  }

  const encoding: WheelEncoding = {
    dimensionValue: (dimKey) =>
      summits.filter((s) => DOMAIN_META[s.domainKey]?.dimensionKey === dimKey).length,
    domainValue: (domainKey) => summits.filter((s) => s.domainKey === domainKey).length,
    domainActive: (domainKey) =>
      summits.some((s) => s.domainKey === domainKey && s.active),
    domainAlignment: (domainKey) => alignment[domainKey] ?? null,
    domainSummits: (domainKey) =>
      summits
        .filter((s) => s.domainKey === domainKey)
        .map((s) => ({ active: Boolean(s.active) })),
  };

  const handlers: HierarchyHandlers = {
    onAddChild: (parentId, title) => run(addChildAction(parentId, title)),
    onDelete: (id) => run(deleteItemAction(id)),
    onEdit: (id, title) => run(renameItemAction(id, title)),
    onEditDetails: (id, d: SummitDetails) => run(updateSummitDetailsAction(id, d)),
    onEditJourneyDetails: (id, d: JourneyDetails) =>
      run(updateJourneyDetailsAction(id, d)),
    onEditActionDetails: (id, d: ActionDetails) => run(updateActionDetailsAction(id, d)),
    onEditStepDetails: (id, d: StepDetails) => run(updateStepDetailsAction(id, d)),
  };

  const selectedKey =
    selection.type === "domain"
      ? selection.domainKey
      : selection.type === "dimension"
        ? selection.dimensionKey
        : null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex shrink-0 justify-center lg:basis-2/5 lg:justify-start">
        <WheelOfLife
          encoding={encoding}
          encodingMode="summitCount"
          centerLabel="Life"
          rotatable
          selectedKey={selectedKey}
          onSelectDimension={(dimensionKey) =>
            setSelection({ type: "dimension", dimensionKey })
          }
          onSelectDomain={(domainKey, dimensionKey) =>
            setSelection({ type: "domain", domainKey, dimensionKey })
          }
          onSelectCenter={() => setSelection({ type: "none" })}
        />
      </div>

      <div className="flex-1" style={{ marginTop: 48 }}>
        <AlignDetailPanel
          selection={selection}
          summits={summits}
          handlers={handlers}
          onCreateSummit={(domainKey, title) => run(createSummitAction(domainKey, title))}
          onOpenDomain={(domainKey, dimensionKey) =>
            setSelection({ type: "domain", domainKey, dimensionKey })
          }
          onOpenDimension={(dimensionKey) =>
            setSelection({ type: "dimension", dimensionKey })
          }
        />
      </div>
    </div>
  );
}
