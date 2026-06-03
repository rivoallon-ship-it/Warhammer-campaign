"use client";

import { useFormStatus } from "react-dom";
import { revealOrdersAction } from "@/app/campaigns/[campaignId]/reveal/actions";
import { Button } from "@/components/ui";

type RevealOrdersFormProps = {
  campaignId: string;
  returnTo?: "campaign" | "reveal";
};

function RevealSubmitButton() {
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
          Révélation...
        </>
      ) : (
        "Révéler les ordres"
      )}
    </Button>
  );
}

export function RevealOrdersForm({
  campaignId,
  returnTo = "reveal",
}: RevealOrdersFormProps) {
  return (
    <form action={revealOrdersAction}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <RevealSubmitButton />
    </form>
  );
}
