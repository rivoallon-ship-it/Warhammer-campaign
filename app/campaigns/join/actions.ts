"use server";

import { redirect } from "next/navigation";
import { joinCampaign } from "@/lib/campaigns/join-campaign";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(inviteCode: string, message: string) {
  const params = new URLSearchParams();

  if (inviteCode) {
    params.set("code", inviteCode);
  }

  params.set("error", message);
  redirect(`/campaigns/join?${params.toString()}`);
}

export async function joinCampaignAction(formData: FormData) {
  const inviteCode = getFormValue(formData, "inviteCode");
  const displayName = getFormValue(formData, "displayName");
  const aosFaction = getFormValue(formData, "aosFaction");
  const color = getFormValue(formData, "color");
  const startingCapitalCode = getFormValue(formData, "startingCapitalCode");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/campaigns/join");
  }

  const { campaignId, error } = await joinCampaign(supabase, user, {
    inviteCode,
    displayName,
    aosFaction,
    color,
    startingCapitalCode,
  });

  if (error || !campaignId) {
    redirectWithError(inviteCode, error ?? "Impossible de rejoindre la campagne.");
  }

  redirect(`/campaigns/${campaignId}/lobby?joined=1`);
}
