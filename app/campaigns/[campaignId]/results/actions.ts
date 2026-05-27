"use server";

import { redirect } from "next/navigation";
import {
  resolveBattle,
  resolveExploration,
} from "@/lib/resolution/results-service";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectToResults(campaignId: string, params: Record<string, string>): never {
  const searchParams = new URLSearchParams(params);
  redirect(`/campaigns/${campaignId}/results?${searchParams.toString()}`);
}

export async function resolveExplorationAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const explorationId = getFormValue(formData, "explorationId");
  const diceResult = Number(getFormValue(formData, "diceResult"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/results`);
  }

  const { result, error } = await resolveExploration(
    supabase,
    user,
    campaignId,
    explorationId,
    diceResult,
  );

  if (error || !result) {
    redirectToResults(campaignId, { error: error ?? "Résolution impossible." });
  }

  redirectToResults(campaignId, {
    exploration: result.exploration_success ? "success" : "failure",
  });
}

export async function resolveBattleAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const battleId = getFormValue(formData, "battleId");
  const winnerCampaignPlayerId = getFormValue(formData, "winnerCampaignPlayerId");
  const resultNotes = getFormValue(formData, "resultNotes");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/results`);
  }

  const { result, error } = await resolveBattle(
    supabase,
    user,
    campaignId,
    battleId,
    winnerCampaignPlayerId,
    resultNotes,
  );

  if (error || !result) {
    redirectToResults(campaignId, { error: error ?? "Résolution impossible." });
  }

  redirectToResults(campaignId, {
    battle: result.winner_role === "attacker" ? "attacker" : "defender",
  });
}
