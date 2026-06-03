"use client";

import { useFormStatus } from "react-dom";
import { finishTurnAction } from "@/app/campaigns/[campaignId]/results/actions";
import { Button } from "@/components/ui";

type FinishTurnFormProps = {
  campaignId: string;
};

function FinishTurnButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="danger"
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
          Fin du tour...
        </>
      ) : (
        "Terminer le tour"
      )}
    </Button>
  );
}

export function FinishTurnForm({ campaignId }: FinishTurnFormProps) {
  return (
    <form action={finishTurnAction}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <FinishTurnButton />
    </form>
  );
}
