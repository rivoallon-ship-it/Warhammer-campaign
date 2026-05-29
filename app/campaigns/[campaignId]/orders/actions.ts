"use server";

import { redirect } from "next/navigation";
import { submitOrder } from "@/lib/orders/order-service";
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

  return `/campaigns/${campaignId}/orders`;
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

  const { error } = await submitOrder(supabase, user, campaignId, {
    actionType,
    sourceTerritoryId,
    targetTerritoryId,
  });

  if (error) {
    redirectAfterSubmit(campaignId, formData, { error });
  }

  redirectAfterSubmit(campaignId, formData, { submitted: "1" });
}
