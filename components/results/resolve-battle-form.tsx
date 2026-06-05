"use client";

import { useFormStatus } from "react-dom";
import { resolveBattleAction } from "@/app/campaigns/[campaignId]/results/actions";
import { Button, Input, Select, Textarea } from "@/components/ui";

type ResolveBattleFormProps = {
  campaignId: string;
  battleId: string;
  participants: {
    campaignPlayerId: string;
    name: string;
    dragonRecruits: number;
    giantRecruits: number;
  }[];
};

function ResolveBattleButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
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
          Résolution...
        </>
      ) : (
        "Résoudre la bataille"
      )}
    </Button>
  );
}

export function ResolveBattleForm({
  campaignId,
  battleId,
  participants,
}: ResolveBattleFormProps) {
  const participantsWithRecruits = participants.filter(
    (participant) =>
      participant.dragonRecruits > 0 || participant.giantRecruits > 0,
  );

  return (
    <form action={resolveBattleAction} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="battleId" value={battleId} />
      <Select
        name="winnerCampaignPlayerId"
        label="Vainqueur"
        options={participants.map((participant) => ({
          label: participant.name,
          value: participant.campaignPlayerId,
        }))}
      />
      <Textarea
        name="resultNotes"
        label="Notes"
        placeholder="Score, scénario, moment marquant..."
      />
      {participantsWithRecruits.length ? (
        <div className="fantasy-stat space-y-3 p-3">
          <p className="text-sm font-semibold text-[#f3ead7]">
            Pertes légendaires
          </p>
          {participantsWithRecruits.map((participant) => (
            <div key={participant.campaignPlayerId} className="grid gap-2 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm font-semibold text-[#f3ead7]">
                {participant.name}
              </p>
              {participant.dragonRecruits > 0 ? (
                <Input
                  name={`dragonLoss:${participant.campaignPlayerId}`}
                  type="number"
                  min={0}
                  max={participant.dragonRecruits}
                  defaultValue={0}
                  label={`Dragons perdus / ${participant.dragonRecruits}`}
                />
              ) : null}
              {participant.giantRecruits > 0 ? (
                <Input
                  name={`giantLoss:${participant.campaignPlayerId}`}
                  type="number"
                  min={0}
                  max={participant.giantRecruits}
                  defaultValue={0}
                  label={`Géants perdus / ${participant.giantRecruits}`}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <ResolveBattleButton />
    </form>
  );
}
