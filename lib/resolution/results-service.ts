import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  type CampaignDashboardData,
  getCampaignDashboard,
  getPlayerById,
} from "@/lib/campaigns/campaign-dashboard-service";
import type { Database } from "@/types/database";

type CampaignPlayerRow = Database["public"]["Tables"]["campaign_players"]["Row"];
type TerritoryRow = Database["public"]["Tables"]["territories"]["Row"];
type ExplorationRow = Database["public"]["Tables"]["explorations"]["Row"];
type BattleRow = Database["public"]["Tables"]["battles"]["Row"];
type ResolveExplorationRpcResult =
  Database["public"]["Functions"]["resolve_exploration_result"]["Returns"][number];
type ResolveBattleRpcResult =
  Database["public"]["Functions"]["resolve_battle_result"]["Returns"][number];

export type ExplorationResultItem = ExplorationRow & {
  player: CampaignPlayerRow | null;
  territory: TerritoryRow | null;
};

export type BattleResultItem = BattleRow & {
  attacker: CampaignPlayerRow | null;
  defender: CampaignPlayerRow | null;
  territory: TerritoryRow | null;
};

export type ResultsPageData = CampaignDashboardData & {
  explorations: ExplorationResultItem[];
  battles: BattleResultItem[];
};

export function getResultsReadiness(resultsData: ResultsPageData) {
  const { campaign, currentPlayer, currentTurn, explorations, battles } =
    resultsData;
  const isGameMaster =
    currentPlayer?.role === "game_master" && currentPlayer.status === "active";
  const pendingExplorationCount = explorations.filter(
    (exploration) => exploration.status === "pending",
  ).length;
  const resolvedExplorationCount = explorations.filter(
    (exploration) => exploration.status === "resolved",
  ).length;
  const pendingBattleCount = battles.filter(
    (battle) => battle.status === "pending",
  ).length;
  const blockers: string[] = [];

  if (!isGameMaster) {
    blockers.push("Seul le maître de campagne peut saisir les résultats.");
  }

  if (campaign.status !== "active" || campaign.current_phase !== "resolving") {
    blockers.push("La campagne doit être en phase de résolution.");
  }

  if (!currentTurn || currentTurn.phase !== "resolving") {
    blockers.push("Le tour courant doit être en phase de résolution.");
  }

  return {
    isGameMaster,
    canResolveResults: blockers.length === 0,
    canResolveExplorations: blockers.length === 0,
    blockers,
    pendingExplorationCount,
    resolvedExplorationCount,
    pendingBattleCount,
  };
}

export async function getResultsPageData(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  userId: string,
) {
  const { dashboard, error } = await getCampaignDashboard(
    supabase,
    campaignId,
    userId,
  );

  if (error || !dashboard) {
    return { resultsData: null, error: error ?? "Campagne introuvable." };
  }

  const { data: explorations, error: explorationsError } = dashboard.currentTurn
    ? await supabase
        .from("explorations")
        .select("*")
        .eq("campaign_id", dashboard.campaign.id)
        .eq("turn_id", dashboard.currentTurn.id)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (explorationsError) {
    return { resultsData: null, error: "Impossible de charger les explorations." };
  }

  const { data: battles, error: battlesError } = dashboard.currentTurn
    ? await supabase
        .from("battles")
        .select("*")
        .eq("campaign_id", dashboard.campaign.id)
        .eq("turn_id", dashboard.currentTurn.id)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (battlesError) {
    return { resultsData: null, error: "Impossible de charger les batailles." };
  }

  const playersById = getPlayerById(dashboard.activePlayers);
  const territoryById = new Map(
    dashboard.territories.map((territory) => [territory.id, territory]),
  );
  const explorationItems = (explorations ?? []).map((exploration) => ({
    ...exploration,
    player: playersById.get(exploration.campaign_player_id) ?? null,
    territory: territoryById.get(exploration.territory_id) ?? null,
  }));
  const battleItems = (battles ?? []).map((battle) => ({
    ...battle,
    attacker: playersById.get(battle.attacker_campaign_player_id) ?? null,
    defender: playersById.get(battle.defender_campaign_player_id) ?? null,
    territory: territoryById.get(battle.territory_id) ?? null,
  }));

  return {
    resultsData: {
      ...dashboard,
      explorations: explorationItems,
      battles: battleItems,
    } satisfies ResultsPageData,
    error: null,
  };
}

export async function resolveExploration(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
  explorationId: string,
  diceResult: number,
) {
  if (!explorationId) {
    return { result: null, error: "Exploration introuvable." };
  }

  if (!Number.isInteger(diceResult) || diceResult < 1 || diceResult > 6) {
    return { result: null, error: "Le résultat doit être un D6 entre 1 et 6." };
  }

  const { resultsData, error } = await getResultsPageData(
    supabase,
    campaignId,
    user.id,
  );

  if (error || !resultsData) {
    return { result: null, error: error ?? "Campagne introuvable." };
  }

  const readiness = getResultsReadiness(resultsData);

  if (!readiness.canResolveExplorations) {
    return { result: null, error: readiness.blockers.join(" ") };
  }

  const exploration = resultsData.explorations.find(
    (item) => item.id === explorationId,
  );

  if (!exploration) {
    return { result: null, error: "Exploration introuvable pour ce tour." };
  }

  if (exploration.status !== "pending") {
    return { result: null, error: "Cette exploration est déjà résolue." };
  }

  const { data, error: rpcError } = await supabase.rpc(
    "resolve_exploration_result",
    {
      target_exploration_id: explorationId,
      submitted_dice_result: diceResult,
    },
  );

  if (rpcError) {
    return {
      result: null,
      error:
        "La fonction SQL de résolution d'exploration n'est pas encore installée dans Supabase.",
    };
  }

  const result = data?.[0] as ResolveExplorationRpcResult | undefined;

  if (!result) {
    return { result: null, error: "Résolution impossible." };
  }

  if (!result.success) {
    return {
      result: null,
      error: result.error ?? "Résolution impossible.",
    };
  }

  return { result, error: null };
}

export async function resolveBattle(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
  battleId: string,
  winnerCampaignPlayerId: string,
  resultNotes: string,
) {
  if (!battleId) {
    return { result: null, error: "Bataille introuvable." };
  }

  if (!winnerCampaignPlayerId) {
    return { result: null, error: "Choisis le vainqueur de la bataille." };
  }

  const { resultsData, error } = await getResultsPageData(
    supabase,
    campaignId,
    user.id,
  );

  if (error || !resultsData) {
    return { result: null, error: error ?? "Campagne introuvable." };
  }

  const readiness = getResultsReadiness(resultsData);

  if (!readiness.canResolveResults) {
    return { result: null, error: readiness.blockers.join(" ") };
  }

  const battle = resultsData.battles.find((item) => item.id === battleId);

  if (!battle) {
    return { result: null, error: "Bataille introuvable pour ce tour." };
  }

  if (battle.status !== "pending") {
    return { result: null, error: "Cette bataille est déjà résolue." };
  }

  if (
    winnerCampaignPlayerId !== battle.attacker_campaign_player_id &&
    winnerCampaignPlayerId !== battle.defender_campaign_player_id
  ) {
    return { result: null, error: "Le vainqueur doit participer à cette bataille." };
  }

  const { data, error: rpcError } = await supabase.rpc("resolve_battle_result", {
    target_battle_id: battleId,
    submitted_winner_campaign_player_id: winnerCampaignPlayerId,
    submitted_result_notes: resultNotes,
  });

  if (rpcError) {
    return {
      result: null,
      error:
        "La fonction SQL de résolution de bataille n'est pas encore installée dans Supabase.",
    };
  }

  const result = data?.[0] as ResolveBattleRpcResult | undefined;

  if (!result) {
    return { result: null, error: "Résolution impossible." };
  }

  if (!result.success) {
    return {
      result: null,
      error: result.error ?? "Résolution impossible.",
    };
  }

  return { result, error: null };
}
