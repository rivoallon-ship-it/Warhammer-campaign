"use client";

import type { FormEvent } from "react";
import { finishTurnAction } from "@/app/campaigns/[campaignId]/results/actions";
import { Button } from "@/components/ui";

type FinishTurnFormProps = {
  campaignId: string;
};

export function FinishTurnForm({ campaignId }: FinishTurnFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Terminer le tour et ouvrir le tour suivant ? Les joueurs pourront alors donner leurs nouveaux ordres.",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form action={finishTurnAction} onSubmit={handleSubmit}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <Button type="submit" variant="danger" className="w-full">
        Terminer le tour
      </Button>
    </form>
  );
}
