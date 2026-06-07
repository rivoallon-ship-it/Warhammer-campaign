"use client";

import { useFormStatus } from "react-dom";
import { commitLegendaryReinforcementsAction } from "@/app/campaigns/[campaignId]/results/actions";
import { Button, Input } from "@/components/ui";

type LegendaryCommitmentFormProps = {
  campaignId: string;
  battleId: string;
  dragonRecruitsCommitted: number;
  giantRecruitsCommitted: number;
  maxDragonRecruits: number;
  maxGiantRecruits: number;
};

function LegendaryCommitmentButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      className="w-full gap-2"
      disabled={pending}
      aria-live="polite"
    >
      {pending ? (
        <>
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          Engagement...
        </>
      ) : (
        "Engager les renforts"
      )}
    </Button>
  );
}

export function LegendaryCommitmentForm({
  campaignId,
  battleId,
  dragonRecruitsCommitted,
  giantRecruitsCommitted,
  maxDragonRecruits,
  maxGiantRecruits,
}: LegendaryCommitmentFormProps) {
  const canCommit =
    maxDragonRecruits > 0 ||
    maxGiantRecruits > 0 ||
    dragonRecruitsCommitted > 0 ||
    giantRecruitsCommitted > 0;

  if (!canCommit) return null;

  return (
    <form action={commitLegendaryReinforcementsAction} className="fantasy-stat space-y-3 p-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="battleId" value={battleId} />
      <div>
        <p className="text-sm font-semibold text-[#f3ead7]">
          Renforts légendaires
        </p>
        <p className="fantasy-muted mt-1 text-xs">
          Les unités non engagées restent en réserve et ne peuvent pas être perdues.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          name="dragonRecruitsCommitted"
          type="number"
          min={0}
          max={maxDragonRecruits}
          defaultValue={dragonRecruitsCommitted}
          label={`Dragons / ${maxDragonRecruits}`}
        />
        <Input
          name="giantRecruitsCommitted"
          type="number"
          min={0}
          max={maxGiantRecruits}
          defaultValue={giantRecruitsCommitted}
          label={`Géants / ${maxGiantRecruits}`}
        />
      </div>
      <LegendaryCommitmentButton />
    </form>
  );
}
