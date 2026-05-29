"use client";

import type { FormEvent } from "react";
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

export function ResolveBattleForm({
  campaignId,
  battleId,
  participants,
}: ResolveBattleFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Enregistrer ce résultat de bataille ? La Gloire, le territoire et la fortification seront mis à jour.",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form action={resolveBattleAction} onSubmit={handleSubmit} className="space-y-3">
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
      <Button type="submit" className="w-full">
        Résoudre la bataille
      </Button>
    </form>
  );
}
