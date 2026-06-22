"use client";

import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { deleteCampaignAction } from "@/app/campaigns/[campaignId]/actions";
import { Button } from "@/components/ui";

type DeleteCampaignReturnTo = "campaign" | "dashboard" | "lobby";

type DeleteCampaignFormProps = {
  campaignId: string;
  campaignName: string;
  returnTo: DeleteCampaignReturnTo;
  className?: string;
  formClassName?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
};

function DeleteCampaignButton({
  className,
  label,
  size,
}: Pick<DeleteCampaignFormProps, "className" | "label" | "size">) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="danger"
      size={size}
      className={`fantasy-action-button gap-2 ${className ?? ""}`}
      disabled={pending}
      aria-live="polite"
    >
      {pending ? (
        <>
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          Suppression...
        </>
      ) : (
        (label ?? "Supprimer la campagne")
      )}
    </Button>
  );
}

export function DeleteCampaignForm({
  campaignId,
  campaignName,
  returnTo,
  className,
  formClassName,
  label,
  size = "md",
}: DeleteCampaignFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Supprimer définitivement la campagne "${campaignName}" ? Toutes les données associées seront supprimées.`,
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteCampaignAction} onSubmit={handleSubmit} className={formClassName}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <DeleteCampaignButton className={className} label={label} size={size} />
    </form>
  );
}
