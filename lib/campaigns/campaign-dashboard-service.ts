import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignPlayerRow = Database["public"]["Tables"]["campaign_players"]["Row"];
type CampaignTurnRow = Database["public"]["Tables"]["campaign_turns"]["Row"];
type TerritoryRow = Database["public"]["Tables"]["territories"]["Row"];
type AdjacencyRow =
  Database["public"]["Tables"]["territory_adjacencies"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type CampaignLogRow = Database["public"]["Tables"]["campaign_logs"]["Row"];
export type CampaignOrderVisibilityRow =
  Database["public"]["Functions"]["get_current_turn_order_visibility"]["Returns"][number];
export type CampaignLogItem = CampaignLogRow & {
  turn: Pick<CampaignTurnRow, "season_number" | "turn_number"> | null;
};

export type CampaignDashboardData = {
  campaign: CampaignRow;
  currentPlayer: CampaignPlayerRow | null;
  activePlayers: CampaignPlayerRow[];
  pendingPlayers: CampaignPlayerRow[];
  currentTurn: CampaignTurnRow | null;
  territories: TerritoryRow[];
  adjacencies: AdjacencyRow[];
  orders: OrderRow[];
  orderVisibility: CampaignOrderVisibilityRow[];
  logs: CampaignLogItem[];
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

export function getOrderVisibilityByPlayerId(
  orderVisibility: CampaignOrderVisibilityRow[],
) {
  return new Map(
    orderVisibility.map((visibility) => [
      visibility.campaign_player_id,
      visibility,
    ]),
  );
}

function buildOrderVisibilityFallback(
  activePlayers: CampaignPlayerRow[],
  orders: OrderRow[],
  territories: TerritoryRow[],
) {
  const orderByPlayerId = getVisibleOrderByPlayerId(orders);
  const territoryById = new Map(
    territories.map((territory) => [territory.id, territory]),
  );

  return activePlayers.map((player) => {
    const order = orderByPlayerId.get(player.id);
    const source = order?.source_territory_id
      ? territoryById.get(order.source_territory_id)
      : null;
    const target = order?.target_territory_id
      ? territoryById.get(order.target_territory_id)
      : null;

    return {
      campaign_player_id: player.id,
      display_name: player.display_name,
      order_id: order?.id ?? null,
      order_status: order?.status ?? "pending",
      can_view_details: Boolean(order),
      action_type: order?.action_type ?? null,
      source_territory_id: order?.source_territory_id ?? null,
      source_territory_code: source?.code ?? null,
      target_territory_id: order?.target_territory_id ?? null,
      target_territory_code: target?.code ?? null,
      submitted_at: order?.submitted_at ?? null,
    } satisfies CampaignOrderVisibilityRow;
  });
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
  const { data: adjacencies } = await supabase
    .from("territory_adjacencies")
    .select("*")
    .eq("campaign_id", campaign.id);

  const { data: orders } = currentTurn
    ? await supabase
        .from("orders")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("turn_id", currentTurn.id)
    : { data: [] };
  const fallbackOrderVisibility = buildOrderVisibilityFallback(
    activePlayers,
    orders ?? [],
    territories ?? [],
  );
  const { data: orderVisibilityData } = currentTurn
    ? await supabase.rpc("get_current_turn_order_visibility", {
        target_campaign_id: campaign.id,
      })
    : { data: null };
  const orderVisibility = orderVisibilityData?.length
    ? orderVisibilityData
    : fallbackOrderVisibility;

  const { data: logs } = await supabase
    .from("campaign_logs")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false })
    .limit(10);
  const logTurnIds = Array.from(
    new Set(
      (logs ?? [])
        .map((log) => log.turn_id)
        .filter((turnId): turnId is string => Boolean(turnId)),
    ),
  );
  const { data: logTurns } = logTurnIds.length
    ? await supabase
        .from("campaign_turns")
        .select("id, season_number, turn_number")
        .eq("campaign_id", campaign.id)
        .in("id", logTurnIds)
    : { data: [] };
  const logTurnById = new Map(
    (logTurns ?? []).map((turn) => [
      turn.id,
      {
        season_number: turn.season_number,
        turn_number: turn.turn_number,
      },
    ]),
  );
  const logsWithTurns = (logs ?? []).map((log) => ({
    ...log,
    turn: log.turn_id ? (logTurnById.get(log.turn_id) ?? null) : null,
  }));

  return {
    dashboard: {
      campaign,
      currentPlayer,
      activePlayers,
      pendingPlayers,
      currentTurn: currentTurn ?? null,
      territories: territories ?? [],
      adjacencies: adjacencies ?? [],
      orders: orders ?? [],
      orderVisibility,
      logs: logsWithTurns,
    } satisfies CampaignDashboardData,
    error: null,
  };
}
