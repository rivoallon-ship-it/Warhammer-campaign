"use server";

import { redirect } from "next/navigation";
import { recruitLegendaryUnit } from "@/lib/campaigns/recruitment-service";
import {
  getLegendaryRecruitmentCost,
  getLegendaryUnitLabel,
  isLegendaryUnitType,
} from "@/lib/campaigns/recruitment-rules";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectToCampaign(
  campaignId: string,
  params: Record<string, string>,
): never {
  const searchParams = new URLSearchParams(params);
  redirect(`/campaigns/${campaignId}?${searchParams.toString()}`);
}

function redirectToCampaignAnchor(
  campaignId: string,
  params: Record<string, string>,
  anchor: string,
): never {
  const searchParams = new URLSearchParams(params);
  const query = searchParams.size ? `?${searchParams.toString()}` : "";

  redirect(`/campaigns/${campaignId}${query}#${anchor}`);
}

function getChatInstallError(errorMessage: string) {
  if (
    errorMessage.includes("campaign_messages") ||
    errorMessage.includes("recipient_campaign_player_id") ||
    errorMessage.includes("Could not find the table")
  ) {
    return "La messagerie privée n'est pas encore installée dans Supabase. Copie le morceau SQL 22_private_diplomacy_messages.sql.";
  }

  return "Impossible d'envoyer le message pour le moment.";
}

export async function recruitLegendaryUnitAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const unitType = getFormValue(formData, "unitType");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}`);
  }

  const { error } = await recruitLegendaryUnit(
    supabase,
    user,
    campaignId,
    unitType,
  );

  if (error) {
    redirectToCampaign(campaignId, { error });
  }

  redirectToCampaign(campaignId, {
    recruited: getLegendaryUnitLabel(unitType),
    spent: isLegendaryUnitType(unitType)
      ? String(getLegendaryRecruitmentCost(unitType))
      : "",
  });
}

export async function sendCampaignMessageAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const recipientCampaignPlayerId = getFormValue(
    formData,
    "recipientCampaignPlayerId",
  );
  const body = getFormValue(formData, "body");

  if (!campaignId) {
    redirect("/dashboard?error=Campagne introuvable.");
  }

  if (!recipientCampaignPlayerId) {
    redirectToCampaignAnchor(
      campaignId,
      { error: "Choisis un joueur destinataire." },
      "campaign-chat",
    );
  }

  if (!body) {
    redirectToCampaignAnchor(
      campaignId,
      { error: "Le message ne peut pas être vide." },
      "campaign-chat",
    );
  }

  if (body.length > 800) {
    redirectToCampaignAnchor(
      campaignId,
      { error: "Le message est limité à 800 caractères." },
      "campaign-chat",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}`);
  }

  const { data: campaignPlayer, error: playerError } = await supabase
    .from("campaign_players")
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (playerError || !campaignPlayer || campaignPlayer.status !== "active") {
    redirectToCampaignAnchor(
      campaignId,
      { error: "Tu dois être un joueur actif pour écrire un message privé." },
      "campaign-chat",
    );
  }

  if (campaignPlayer.id === recipientCampaignPlayerId) {
    redirectToCampaignAnchor(
      campaignId,
      { error: "Choisis un autre joueur comme destinataire." },
      "campaign-chat",
    );
  }

  const { data: recipientPlayer, error: recipientError } = await supabase
    .from("campaign_players")
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("id", recipientCampaignPlayerId)
    .maybeSingle();

  if (
    recipientError ||
    !recipientPlayer ||
    recipientPlayer.status !== "active"
  ) {
    redirectToCampaignAnchor(
      campaignId,
      { error: "Le destinataire doit être un joueur actif de la campagne." },
      "campaign-chat",
    );
  }

  const { error } = await supabase.from("campaign_messages").insert({
    campaign_id: campaignId,
    campaign_player_id: campaignPlayer.id,
    recipient_campaign_player_id: recipientPlayer.id,
    body,
  });

  if (error) {
    redirectToCampaignAnchor(
      campaignId,
      { error: getChatInstallError(error.message) },
      "campaign-chat",
    );
  }

  redirect(`/campaigns/${campaignId}#campaign-chat`);
}
