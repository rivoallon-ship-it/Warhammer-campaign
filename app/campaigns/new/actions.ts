"use server";

import { redirect } from "next/navigation";
import { createCampaign } from "@/lib/campaigns/create-campaign";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(message: string) {
  redirect(`/campaigns/new?error=${encodeURIComponent(message)}`);
}

export async function createCampaignAction(formData: FormData) {
  const name = getFormValue(formData, "name");
  const playerCount = Number(getFormValue(formData, "playerCount"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/campaigns/new");
  }

  const { campaignId, error } = await createCampaign(supabase, user, {
    name,
    playerCount,
  });

  if (error || !campaignId) {
    redirectWithError(error ?? "Impossible de créer la campagne.");
  }

  redirect(`/campaigns/${campaignId}/lobby`);
}
