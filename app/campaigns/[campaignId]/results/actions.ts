"use server";

import { redirect } from "next/navigation";
import {
  type LegendaryBattleLossInput,
  commitLegendaryReinforcements,
  finishTurn,
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

function getLegendaryLosses(formData: FormData) {
  const lossesByPlayerId = new Map<string, LegendaryBattleLossInput>();

  for (const [key, rawValue] of formData.entries()) {
    const match = /^(dragon|giant)Loss:(.+)$/.exec(key);

    if (!match) continue;

    const [, unitType, campaignPlayerId] = match;
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    const lossCount = value === "" ? 0 : Number(value);

    if (!Number.isInteger(lossCount) || lossCount < 0) {
      return {
        losses: [],
        error: "Les pertes légendaires doivent être des nombres entiers positifs.",
      };
    }

    const existing = lossesByPlayerId.get(campaignPlayerId) ?? {
      campaign_player_id: campaignPlayerId,
      dragon_losses: 0,
      giant_losses: 0,
    };

    if (unitType === "dragon") {
      existing.dragon_losses = lossCount;
    } else {
      existing.giant_losses = lossCount;
    }

    lossesByPlayerId.set(campaignPlayerId, existing);
  }

  return {
    losses: [...lossesByPlayerId.values()].filter(
      (loss) => loss.dragon_losses > 0 || loss.giant_losses > 0,
    ),
    error: null,
  };
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
  const { losses, error: lossesError } = getLegendaryLosses(formData);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/results`);
  }

  if (lossesError) {
    redirectToResults(campaignId, { error: lossesError });
  }

  const { result, error } = await resolveBattle(
    supabase,
    user,
    campaignId,
    battleId,
    winnerCampaignPlayerId,
    resultNotes,
    losses,
  );

  if (error || !result) {
    redirectToResults(campaignId, { error: error ?? "Résolution impossible." });
  }

  redirectToResults(campaignId, { battle: "resolved" });
}

export async function commitLegendaryReinforcementsAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const battleId = getFormValue(formData, "battleId");
  const dragonRecruitsCommitted = Number(
    getFormValue(formData, "dragonRecruitsCommitted"),
  );
  const giantRecruitsCommitted = Number(
    getFormValue(formData, "giantRecruitsCommitted"),
  );
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/results`);
  }

  const { result, error } = await commitLegendaryReinforcements(
    supabase,
    user,
    campaignId,
    battleId,
    dragonRecruitsCommitted,
    giantRecruitsCommitted,
  );

  if (error || !result) {
    redirectToResults(campaignId, { error: error ?? "Engagement impossible." });
  }

  redirectToResults(campaignId, { commitment: "updated" });
}

export async function finishTurnAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/results`);
  }

  const { result, error } = await finishTurn(supabase, user, campaignId);

  if (error || !result) {
    redirectToResults(campaignId, { error: error ?? "Fin de tour impossible." });
  }

  redirect(
    `/campaigns/${campaignId}?turnFinished=1&turn=${result.next_turn_number ?? ""}`,
  );
}
