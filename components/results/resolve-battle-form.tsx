"use client";

import { useFormStatus } from "react-dom";
import { resolveBattleAction } from "@/app/campaigns/[campaignId]/results/actions";
import { Button, Select, Textarea } from "@/components/ui";

type ResolveBattleFormProps = {
  campaignId: string;
  battleId: string;
  participants: {
    campaignPlayerId: string;
    name: string;
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
      <ResolveBattleButton />
    </form>
  );
}
