import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getLobbyData } from "@/lib/campaigns/lobby-service";
import { getArmyBasePoints } from "@/lib/campaigns/turns";
import { generateMap } from "@/lib/maps/generate-map";
import type { Database } from "@/types/database";

type CampaignTurnRow = Database["public"]["Tables"]["campaign_turns"]["Row"];

async function getOrCreateFirstTurn(
  supabase: SupabaseClient<Database>,
  campaignId: string,
) {
  const { data: existingTurn, error: selectError } = await supabase
    .from("campaign_turns")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("turn_number", 1)
    .maybeSingle();

  if (selectError) {
    return { turn: null, error: "Impossible de vérifier le tour initial." };
  }

  if (existingTurn) {
    return { turn: existingTurn, error: null };
  }

  const { data: insertedTurn, error: insertError } = await supabase
    .from("campaign_turns")
    .insert({
      campaign_id: campaignId,
      season_number: 1,
      turn_number: 1,
      phase: "orders",
      army_base_points: getArmyBasePoints(1),
    })
    .select("*")
    .single();

  if (insertError) {
    return { turn: null, error: "Impossible de créer le tour initial." };
  }

  return { turn: insertedTurn, error: null };
}

async function logCampaignLaunch(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
  turn: CampaignTurnRow,
  territoryCount: number,
) {
  await supabase.from("campaign_logs").insert({
    campaign_id: campaignId,
    turn_id: turn.id,
    type: "campaign_launched",
    title: "Campagne lancée",
    description: `La campagne commence avec ${territoryCount} territoires et ${turn.army_base_points} points d'armée.`,
    created_by_user_id: user.id,
  });
}

export async function launchCampaign(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
) {
  const { lobby, error: lobbyError } = await getLobbyData(
    supabase,
    campaignId,
    user.id,
  );

  if (lobbyError || !lobby) {
    return { error: lobbyError ?? "Lobby introuvable." };
  }

  if (!lobby.isGameMaster) {
    return { error: "Seul le maître de campagne peut lancer la campagne." };
  }

  if (!lobby.launchChecks.canLaunch) {
    return {
      error: `La campagne n'est pas prête : ${lobby.launchChecks.blockers.join(" ")}`,
    };
  }

  const mapResult = await generateMap(supabase, campaignId);

  if (mapResult.error) {
    return { error: mapResult.error };
  }

  const { turn, error: turnError } = await getOrCreateFirstTurn(
    supabase,
    campaignId,
  );

  if (turnError || !turn) {
    return { error: turnError ?? "Impossible de préparer le tour initial." };
  }

  const { error: campaignError } = await supabase
    .from("campaigns")
    .update({
      status: "active",
      current_phase: "orders",
      season_number: 1,
      current_turn_number: 1,
    })
    .eq("id", campaignId);

  if (campaignError) {
    return { error: "Impossible d'activer la campagne." };
  }

  await logCampaignLaunch(
    supabase,
    user,
    campaignId,
    turn,
    mapResult.territoryCount,
  );

  return { error: null };
}
