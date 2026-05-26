import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignPlayerRow = Database["public"]["Tables"]["campaign_players"]["Row"];
type CampaignTurnRow = Database["public"]["Tables"]["campaign_turns"]["Row"];
type TerritoryRow = Database["public"]["Tables"]["territories"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type CampaignLogRow = Database["public"]["Tables"]["campaign_logs"]["Row"];

export type CampaignDashboardData = {
  campaign: CampaignRow;
  currentPlayer: CampaignPlayerRow | null;
  activePlayers: CampaignPlayerRow[];
  pendingPlayers: CampaignPlayerRow[];
  currentTurn: CampaignTurnRow | null;
  territories: TerritoryRow[];
  orders: OrderRow[];
  logs: CampaignLogRow[];
};

export function getPlayerById(players: CampaignPlayerRow[]) {
  return new Map(players.map((player) => [player.id, player]));
}

export function getRankedPlayers(players: CampaignPlayerRow[]) {
  return [...players].sort((left, right) => {
    if (right.glory !== left.glory) return right.glory - left.glory;

    return left.display_name.localeCompare(right.display_name, "fr");
  });
}

export function getTerritoryStats(territories: TerritoryRow[]) {
  const controlledTerritories = territories.filter(
    (territory) => territory.owner_campaign_player_id,
  );
  const fortifiedTerritories = territories.filter(
    (territory) => territory.is_fortified,
  );

  return {
    total: territories.length,
    controlled: controlledTerritories.length,
    neutral: territories.length - controlledTerritories.length,
    fortified: fortifiedTerritories.length,
  };
}

export function getVisibleOrderByPlayerId(orders: OrderRow[]) {
  return new Map(orders.map((order) => [order.campaign_player_id, order]));
}

export async function getCampaignDashboard(
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
    return { dashboard: null, error: "Campagne introuvable." };
  }

  const { data: players, error: playersError } = await supabase
    .from("campaign_players")
    .select("*")
    .eq("campaign_id", campaign.id)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: true });

  if (playersError) {
    return { dashboard: null, error: "Impossible de charger les joueurs." };
  }

  const campaignPlayers = players ?? [];
  const currentPlayer =
    campaignPlayers.find((player) => player.user_id === userId) ?? null;
  const activePlayers = campaignPlayers.filter(
    (player) => player.status === "active",
  );
  const pendingPlayers = campaignPlayers.filter(
    (player) => player.status === "pending",
  );

  const { data: currentTurn } = await supabase
    .from("campaign_turns")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("turn_number", campaign.current_turn_number || 1)
    .maybeSingle();

  const { data: territories } = await supabase
    .from("territories")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("position_y", { ascending: true })
    .order("position_x", { ascending: true });

  const { data: orders } = currentTurn
    ? await supabase
        .from("orders")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("turn_id", currentTurn.id)
    : { data: [] };

  const { data: logs } = await supabase
    .from("campaign_logs")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false })
    .limit(8);

  return {
    dashboard: {
      campaign,
      currentPlayer,
      activePlayers,
      pendingPlayers,
      currentTurn: currentTurn ?? null,
      territories: territories ?? [],
      orders: orders ?? [],
      logs: logs ?? [],
    } satisfies CampaignDashboardData,
    error: null,
  };
}
