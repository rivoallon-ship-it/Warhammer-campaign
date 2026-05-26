import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type MapCampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type MapPlayerRow =
  Database["public"]["Tables"]["campaign_players"]["Row"];
export type MapTerritoryRow =
  Database["public"]["Tables"]["territories"]["Row"];
export type MapAdjacencyRow =
  Database["public"]["Tables"]["territory_adjacencies"]["Row"];

export type CampaignMapData = {
  campaign: MapCampaignRow;
  currentPlayer: MapPlayerRow | null;
  players: MapPlayerRow[];
  territories: MapTerritoryRow[];
  adjacencies: MapAdjacencyRow[];
};

export async function getCampaignMapData(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  userId: string,
) {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    return { mapData: null, error: "Campagne introuvable." };
  }

  const { data: players, error: playersError } = await supabase
    .from("campaign_players")
    .select("*")
    .eq("campaign_id", campaign.id)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: true });

  if (playersError) {
    return { mapData: null, error: "Impossible de charger les joueurs." };
  }

  const campaignPlayers = players ?? [];
  const currentPlayer =
    campaignPlayers.find((player) => player.user_id === userId) ?? null;

  const { data: territories, error: territoriesError } = await supabase
    .from("territories")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("position_y", { ascending: true })
    .order("position_x", { ascending: true });

  if (territoriesError) {
    return { mapData: null, error: "Impossible de charger les territoires." };
  }

  const { data: adjacencies, error: adjacenciesError } = await supabase
    .from("territory_adjacencies")
    .select("*")
    .eq("campaign_id", campaign.id);

  if (adjacenciesError) {
    return { mapData: null, error: "Impossible de charger les adjacences." };
  }

  return {
    mapData: {
      campaign,
      currentPlayer,
      players: campaignPlayers,
      territories: territories ?? [],
      adjacencies: adjacencies ?? [],
    } satisfies CampaignMapData,
    error: null,
  };
}
