import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { OrderAction } from "@/types/campaign";
import type { Database } from "@/types/database";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignPlayerRow = Database["public"]["Tables"]["campaign_players"]["Row"];
type CampaignTurnRow = Database["public"]["Tables"]["campaign_turns"]["Row"];
type TerritoryRow = Database["public"]["Tables"]["territories"]["Row"];
type AdjacencyRow =
  Database["public"]["Tables"]["territory_adjacencies"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export type SubmitOrderInput = {
  actionType: string;
  sourceTerritoryId: string;
  targetTerritoryId: string;
};

export type OrdersPageData = {
  campaign: CampaignRow;
  currentPlayer: CampaignPlayerRow | null;
  currentTurn: CampaignTurnRow | null;
  territories: TerritoryRow[];
  adjacencies: AdjacencyRow[];
  existingOrder: OrderRow | null;
};

export const ORDER_ACTION_OPTIONS: { label: string; value: OrderAction }[] = [
  { label: "Conquérir", value: "conquer" },
  { label: "Fortifier", value: "fortify" },
];

export function getOrderActionLabel(actionType: string) {
  if (actionType === "attack" || actionType === "explore" || actionType === "conquer") {
    return "Conquérir";
  }

  if (actionType === "fortify") return "Fortifier";

  return actionType;
}

function isOrderAction(value: string): value is OrderAction {
  return value === "conquer" || value === "fortify";
}

function getTerritoryById(territories: TerritoryRow[]) {
  return new Map(territories.map((territory) => [territory.id, territory]));
}

function getAdjacentCodes(adjacencies: AdjacencyRow[], territoryCode: string) {
  return new Set(
    adjacencies
      .filter((adjacency) => adjacency.territory_code === territoryCode)
      .map((adjacency) => adjacency.adjacent_territory_code),
  );
}

function isControlledByPlayer(
  territory: TerritoryRow | undefined,
  playerId: string,
) {
  return territory?.owner_campaign_player_id === playerId;
}

function validateSubmittedOrder(
  data: OrdersPageData,
  input: SubmitOrderInput,
) {
  const { campaign, currentPlayer, currentTurn, territories, adjacencies } = data;
  const actionType = input.actionType.trim();

  if (!currentPlayer || currentPlayer.status !== "active") {
    return { order: null, error: "Tu dois être joueur actif pour donner un ordre." };
  }

  if (campaign.status !== "active" || campaign.current_phase !== "orders") {
    return { order: null, error: "Les ordres ne sont pas ouverts pour cette campagne." };
  }

  if (!currentTurn || currentTurn.phase !== "orders") {
    return { order: null, error: "Le tour courant n'accepte pas d'ordres." };
  }

  if (!isOrderAction(actionType)) {
    return { order: null, error: "Choisis un ordre valide." };
  }

  if (
    data.existingOrder &&
    !["draft", "submitted"].includes(data.existingOrder.status)
  ) {
    return { order: null, error: "Cet ordre ne peut plus être modifié." };
  }

  const territoryById = getTerritoryById(territories);
  const sourceTerritory = input.sourceTerritoryId
    ? territoryById.get(input.sourceTerritoryId)
    : undefined;
  const targetTerritory = input.targetTerritoryId
    ? territoryById.get(input.targetTerritoryId)
    : undefined;

  if (actionType === "fortify") {
    const target = targetTerritory ?? sourceTerritory;

    if (!target) {
      return { order: null, error: "Choisis le territoire à fortifier." };
    }

    if (!isControlledByPlayer(target, currentPlayer.id)) {
      return { order: null, error: "Tu ne contrôles pas ce territoire." };
    }

    return {
      order: {
        actionType,
        sourceTerritoryId: null,
        targetTerritoryId: target.id,
      },
      error: null,
    };
  }

  if (!sourceTerritory) {
    return { order: null, error: "Choisis un territoire source." };
  }

  if (!targetTerritory) {
    return { order: null, error: "Choisis une cible." };
  }

  if (!isControlledByPlayer(sourceTerritory, currentPlayer.id)) {
    return { order: null, error: "Le territoire source doit être contrôlé par toi." };
  }

  const adjacentCodes = getAdjacentCodes(adjacencies, sourceTerritory.code);

  if (!adjacentCodes.has(targetTerritory.code)) {
    return { order: null, error: "La cible doit être adjacente à la source." };
  }

  if (targetTerritory.owner_campaign_player_id === currentPlayer.id) {
    return { order: null, error: "Tu contrôles déjà ce territoire." };
  }

  return {
    order: {
      actionType: "conquer",
      sourceTerritoryId: sourceTerritory.id,
      targetTerritoryId: targetTerritory.id,
    },
    error: null,
  };
}

export async function getOrdersPageData(
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
    return { ordersData: null, error: "Campagne introuvable." };
  }

  const { data: players, error: playersError } = await supabase
    .from("campaign_players")
    .select("*")
    .eq("campaign_id", campaign.id)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: true });

  if (playersError) {
    return { ordersData: null, error: "Impossible de charger les joueurs." };
  }

  const currentPlayer =
    players?.find((player) => player.user_id === userId) ?? null;

  const { data: currentTurn } = await supabase
    .from("campaign_turns")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("turn_number", campaign.current_turn_number || 1)
    .maybeSingle();

  const { data: territories, error: territoriesError } = await supabase
    .from("territories")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("position_y", { ascending: true })
    .order("position_x", { ascending: true });

  if (territoriesError) {
    return { ordersData: null, error: "Impossible de charger les territoires." };
  }

  const { data: adjacencies, error: adjacenciesError } = await supabase
    .from("territory_adjacencies")
    .select("*")
    .eq("campaign_id", campaign.id);

  if (adjacenciesError) {
    return { ordersData: null, error: "Impossible de charger les adjacences." };
  }

  const { data: existingOrder } =
    currentTurn && currentPlayer
      ? await supabase
          .from("orders")
          .select("*")
          .eq("turn_id", currentTurn.id)
          .eq("campaign_player_id", currentPlayer.id)
          .maybeSingle()
      : { data: null };

  return {
    ordersData: {
      campaign,
      currentPlayer,
      currentTurn: currentTurn ?? null,
      territories: territories ?? [],
      adjacencies: adjacencies ?? [],
      existingOrder: existingOrder ?? null,
    } satisfies OrdersPageData,
    error: null,
  };
}

export async function submitOrder(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
  input: SubmitOrderInput,
) {
  const { ordersData, error } = await getOrdersPageData(
    supabase,
    campaignId,
    user.id,
  );

  if (error || !ordersData) {
    return { error: error ?? "Campagne introuvable." };
  }

  const { order, error: validationError } = validateSubmittedOrder(
    ordersData,
    input,
  );

  if (validationError || !order) {
    return { error: validationError ?? "Ordre invalide." };
  }

  if (!ordersData.currentPlayer || !ordersData.currentTurn) {
    return { error: "Tour ou joueur introuvable." };
  }

  const orderRow = {
    action_type: order.actionType,
    source_territory_id: order.sourceTerritoryId,
    target_territory_id: order.targetTerritoryId,
    status: "submitted",
    submitted_at: new Date().toISOString(),
  };

  if (ordersData.existingOrder) {
    const { error: updateError } = await supabase
      .from("orders")
      .update(orderRow)
      .eq("id", ordersData.existingOrder.id);

    if (updateError) {
      return { error: "Impossible de modifier ton ordre." };
    }

    return { error: null };
  }

  const { error: insertError } = await supabase.from("orders").insert({
    campaign_id: ordersData.campaign.id,
    turn_id: ordersData.currentTurn.id,
    campaign_player_id: ordersData.currentPlayer.id,
    ...orderRow,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Tu as déjà donné un ordre pour ce tour." };
    }

    return { error: "Impossible d'enregistrer ton ordre." };
  }

  return { error: null };
}

export async function cancelOrder(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
) {
  const { ordersData, error } = await getOrdersPageData(
    supabase,
    campaignId,
    user.id,
  );

  if (error || !ordersData) {
    return { error: error ?? "Campagne introuvable." };
  }

  const { campaign, currentPlayer, currentTurn, existingOrder } = ordersData;

  if (!currentPlayer || currentPlayer.status !== "active") {
    return { error: "Tu dois être joueur actif pour annuler un ordre." };
  }

  if (campaign.status !== "active" || campaign.current_phase !== "orders") {
    return { error: "Les ordres ne sont plus modifiables pour cette campagne." };
  }

  if (!currentTurn || currentTurn.phase !== "orders") {
    return { error: "Le tour courant n'accepte plus de modification d'ordres." };
  }

  if (!existingOrder) {
    return { error: "Aucun ordre à annuler pour ce tour." };
  }

  if (!["draft", "submitted"].includes(existingOrder.status)) {
    return { error: "Cet ordre ne peut plus être annulé." };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "draft",
      submitted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingOrder.id)
    .in("status", ["draft", "submitted"]);

  if (updateError) {
    return { error: "Impossible d'annuler ton ordre." };
  }

  return { error: null };
}
