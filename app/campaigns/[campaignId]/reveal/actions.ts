"use server";

import { redirect } from "next/navigation";
import { revealOrders } from "@/lib/orders/reveal-service";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectToReveal(
  campaignId: string,
  params: Record<string, string>,
): never {
  const searchParams = new URLSearchParams(params);
  redirect(`/campaigns/${campaignId}/reveal?${searchParams.toString()}`);
}

export async function revealOrdersAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/reveal`);
  }

  const { result, error } = await revealOrders(supabase, user, campaignId);

  if (error || !result) {
    redirectToReveal(campaignId, { error: error ?? "Révélation impossible." });
  }

  redirectToReveal(campaignId, {
    revealed: "1",
    battles: String(result.battle_count),
    explorations: String(result.exploration_count),
    fortifications: String(result.fortification_count),
    multi: String(result.multiple_attack_count),
  });
}
