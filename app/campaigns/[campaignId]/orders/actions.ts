"use server";

import { redirect } from "next/navigation";
import { submitOrder } from "@/lib/orders/order-service";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectToOrders(campaignId: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  redirect(`/campaigns/${campaignId}/orders?${searchParams.toString()}`);
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
    redirect(`/login?next=/campaigns/${campaignId}/orders`);
  }

  const { error } = await submitOrder(supabase, user, campaignId, {
    actionType,
    sourceTerritoryId,
    targetTerritoryId,
  });

  if (error) {
    redirectToOrders(campaignId, { error });
  }

  redirectToOrders(campaignId, { submitted: "1" });
}
