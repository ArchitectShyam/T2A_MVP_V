"use client";

import {
  type AspirationMetaPatch,
  type DiscoverCategory,
  type DiscoverCategoryKey,
  MAX_CORE,
  MAX_SIGNATURE_GROWTH,
  MAX_SIGNATURE_STRENGTHS,
  supportsCore,
} from "@lifeos/contracts";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  addItemAction,
  deleteItemAction,
  editEvidenceAction,
  editNoteAction,
  editTextAction,
  reorderCoreAction,
  reorderStrengthRanksAction,
  setCoreAction,
  setStrengthSignatureAction,
  switchStrengthNatureAction,
  updateAspirationMetaAction,
} from "@/app/discover/actions";
import { DiscoverDetailPanel } from "./discover-detail-panel";
import { WheelOfSelfDiscovery } from "./wheel-of-self-discovery";

export interface DiscoverClientProps {
  categories: DiscoverCategory[];
}

export function DiscoverClient({ categories }: DiscoverClientProps) {
  const router = useRouter();
  const [focused, setFocused] = useState<number | null>(null);

  function run(action: Promise<void>) {
    startTransition(async () => {
      await action;
      router.refresh();
    });
  }

  const category = focused != null ? (categories[focused] ?? null) : null;
  const key = category?.key as DiscoverCategoryKey | undefined;

  const isStrengths = key === "strengths";
  const isAspirations = key === "aspirations";
  const showCore = key ? supportsCore(key) : false;
  const showEvidence = key === "values" || key === "beliefs";

  const coreCount = category?.items.filter((i) => i.isCore).length ?? 0;
  const signatureStrengthCount =
    category?.items.filter((i) => i.nature === "strength" && i.isCore).length ?? 0;
  const signatureGrowthCount =
    category?.items.filter((i) => i.nature === "growth_area" && i.isCore).length ?? 0;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[auto_1fr]">
      <div className="flex justify-center lg:justify-start">
        <WheelOfSelfDiscovery categories={categories} onSelect={setFocused} />
      </div>

      <DiscoverDetailPanel
        category={category}
        showEvidence={showEvidence}
        showCore={showCore}
        coreCount={coreCount}
        maxCore={MAX_CORE}
        showStrengths={isStrengths}
        signatureStrengthCount={signatureStrengthCount}
        signatureGrowthCount={signatureGrowthCount}
        maxSignatureStrengths={MAX_SIGNATURE_STRENGTHS}
        maxSignatureGrowth={MAX_SIGNATURE_GROWTH}
        showAspirations={isAspirations}
        collapseAfter={3}
        onAddItem={(text) => key && run(addItemAction(key, text))}
        onEditItem={(id, text) => key && run(editTextAction(key, id, text))}
        onEditNote={(id, note) => key && run(editNoteAction(key, id, note))}
        onEditEvidence={(id, evidence) => key && run(editEvidenceAction(key, id, evidence))}
        onDeleteItem={(id) => key && run(deleteItemAction(key, id))}
        onToggleCore={(id, next) =>
          key &&
          run(
            isStrengths
              ? setStrengthSignatureAction(id, next)
              : setCoreAction(key, id, next),
          )
        }
        onReorderCore={(ids) =>
          key &&
          run(isStrengths ? reorderStrengthRanksAction(ids) : reorderCoreAction(key, ids))
        }
        onSwitchNature={(id) => run(switchStrengthNatureAction(id))}
        onUpdateMeta={(id, patch: AspirationMetaPatch) =>
          run(updateAspirationMetaAction(id, patch))
        }
      />
    </div>
  );
}
