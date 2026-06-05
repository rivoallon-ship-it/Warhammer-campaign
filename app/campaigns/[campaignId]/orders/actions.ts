"use server";

import { redirect } from "next/navigation";
import { cancelOrder, submitOrder } from "@/lib/orders/order-service";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getReturnPath(campaignId: string, formData: FormData) {
  const returnTo = getFormValue(formData, "returnTo");

  if (returnTo === "campaign") {
    return `/campaigns/${campaignId}`;
  }

  return `/campaigns/${campaignId}`;
}

function redirectAfterSubmit(
  campaignId: string,
  formData: FormData,
  params: Record<string, string>,
) {
  const searchParams = new URLSearchParams(params);
  redirect(`${getReturnPath(campaignId, formData)}?${searchParams.toString()}`);
}

export async function submitOrderAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const actionType = getFormValue(formData, "actionType");
  const sourceTerritoryId = getFormValue(formData, "sourceTerritoryId");
  const targetTerritoryId = getFormValue(formData, "targetTerritoryId");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${getReturnPath(campaignId, formData)}`);
  }

  const { error, revealResult, revealWarning } = await submitOrder(
    supabase,
    user,
    campaignId,
    {
      actionType,
      sourceTerritoryId,
      targetTerritoryId,
    },
  );

  if (error) {
    redirectAfterSubmit(campaignId, formData, { error });
  }

  if (revealResult) {
    redirectAfterSubmit(campaignId, formData, {
      revealed: "1",
      battles: String(revealResult.battle_count),
      explorations: String(revealResult.exploration_count),
      fortifications: String(revealResult.fortification_count),
      multi: String(revealResult.multiple_attack_count),
      ...(revealResult.battle_count === 0 ? { autoAdvanced: "1" } : {}),
    });
  }

  redirectAfterSubmit(
    campaignId,
    formData,
    revealWarning
      ? { submitted: "1", error: revealWarning }
      : { submitted: "1" },
  );
}

export async function cancelOrderAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${getReturnPath(campaignId, formData)}`);
  }

  const { error } = await cancelOrder(supabase, user, campaignId);

  if (error) {
    redirectAfterSubmit(campaignId, formData, { error });
  }

  redirectAfterSubmit(campaignId, formData, { cancelled: "1" });
}
