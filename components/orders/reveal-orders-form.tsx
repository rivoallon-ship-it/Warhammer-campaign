"use client";

import type { FormEvent } from "react";
import { revealOrdersAction } from "@/app/campaigns/[campaignId]/reveal/actions";
import { Button } from "@/components/ui";

type RevealOrdersFormProps = {
  campaignId: string;
  returnTo?: "campaign" | "reveal";
};

export function RevealOrdersForm({
  campaignId,
  returnTo = "reveal",
}: RevealOrdersFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Révéler les ordres va créer les batailles, explorations et fortifications du tour. Continuer ?",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form action={revealOrdersAction} onSubmit={handleSubmit}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" className="w-full">
        Révéler les ordres
      </Button>
    </form>
  );
}
