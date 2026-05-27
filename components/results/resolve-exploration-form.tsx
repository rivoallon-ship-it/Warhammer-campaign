"use client";

import type { FormEvent } from "react";
import { resolveExplorationAction } from "@/app/campaigns/[campaignId]/results/actions";
import { Button, Select } from "@/components/ui";

type ResolveExplorationFormProps = {
  campaignId: string;
  explorationId: string;
};

const diceOptions = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
];

export function ResolveExplorationForm({
  campaignId,
  explorationId,
}: ResolveExplorationFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Enregistrer ce résultat d'exploration ? La Gloire et le territoire seront mis à jour.",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form action={resolveExplorationAction} onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="explorationId" value={explorationId} />
      <Select
        name="diceResult"
        label="D6"
        options={diceOptions}
        defaultValue="3"
      />
      <Button type="submit" className="w-full">
        Résoudre l&apos;exploration
      </Button>
    </form>
  );
}
