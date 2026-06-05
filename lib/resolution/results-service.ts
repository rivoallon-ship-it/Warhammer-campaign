import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  type CampaignDashboardData,
  getCampaignDashboard,
  getPlayerById,
} from "@/lib/campaigns/campaign-dashboard-service";
import type { Database, Json } from "@/types/database";

type CampaignPlayerRow = Database["public"]["Tables"]["campaign_players"]["Row"];
type TerritoryRow = Database["public"]["Tables"]["territories"]["Row"];
type ExplorationRow = Database["public"]["Tables"]["explorations"]["Row"];
type BattleRow = Database["public"]["Tables"]["battles"]["Row"];
type BattleParticipantRow =
  Database["public"]["Tables"]["battle_participants"]["Row"];
type ResolveExplorationRpcResult =
  Database["public"]["Functions"]["resolve_exploration_result"]["Returns"][number];
type ResolveBattleRpcResult =
  Database["public"]["Functions"]["resolve_battle_result"]["Returns"][number];
type FinishTurnRpcResult =
  Database["public"]["Functions"]["finish_current_turn"]["Returns"][number];

export type LegendaryBattleLossInput = {
  campaign_player_id: string;
  dragon_losses: number;
  giant_losses: number;
};

export type ExplorationResultItem = ExplorationRow & {
  player: CampaignPlayerRow | null;
  territory: TerritoryRow | null;
};

export type BattleResultItem = BattleRow & {
  attacker: CampaignPlayerRow | null;
  defender: CampaignPlayerRow | null;
  territory: TerritoryRow | null;
  participants: BattleParticipantItem[];
};

export type BattleParticipantItem = BattleParticipantRow & {
  player: CampaignPlayerRow | null;
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
    (exploration) => exploration.status !== "resolved",
  ).length;
  const resolvedExplorationCount = explorations.filter(
    (exploration) => exploration.status === "resolved",
  ).length;
  const pendingBattleCount = battles.filter(
    (battle) => !["played", "cancelled"].includes(battle.status),
  ).length;
  const blockers: string[] = [];
  const finishTurnBlockers: string[] = [];

  if (!isGameMaster) {
    blockers.push("Seul le maître de campagne peut saisir les résultats.");
    finishTurnBlockers.push("Seul le maître de campagne peut terminer le tour.");
  }

  if (campaign.status !== "active" || campaign.current_phase !== "resolving") {
    blockers.push("La campagne doit être en phase de résolution.");
  }

  if (!currentTurn || currentTurn.phase !== "resolving") {
    blockers.push("Le tour courant doit être en phase de résolution.");
  }

  if (
    campaign.status !== "active" ||
    !["resolving", "end_turn"].includes(campaign.current_phase)
  ) {
    finishTurnBlockers.push("La campagne doit être en phase de résolution.");
  }

  if (!currentTurn || !["resolving", "end_turn"].includes(currentTurn.phase)) {
    finishTurnBlockers.push("Le tour courant doit être en phase de résolution.");
  }

  return {
    isGameMaster,
    canResolveResults: blockers.length === 0,
    canResolveExplorations: blockers.length === 0,
    canFinishTurn:
      finishTurnBlockers.length === 0 &&
      pendingExplorationCount === 0 &&
      pendingBattleCount === 0,
    blockers,
    finishTurnBlockers,
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

  const battleIds = (battles ?? []).map((battle) => battle.id);
  const { data: battleParticipants, error: participantsError } = battleIds.length
    ? await supabase
        .from("battle_participants")
        .select("*")
        .eq("campaign_id", dashboard.campaign.id)
        .in("battle_id", battleIds)
        .order("advantage_rank", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (participantsError) {
    return {
      resultsData: null,
      error: "Impossible de charger les participants des batailles.",
    };
  }

  const playersById = getPlayerById(dashboard.activePlayers);
  const territoryById = new Map(
    dashboard.territories.map((territory) => [territory.id, territory]),
  );
  const participantsByBattleId = new Map<string, BattleParticipantItem[]>();

  for (const participant of battleParticipants ?? []) {
    const item = {
      ...participant,
      player: playersById.get(participant.campaign_player_id) ?? null,
    };
    const existingItems = participantsByBattleId.get(participant.battle_id) ?? [];

    existingItems.push(item);
    participantsByBattleId.set(participant.battle_id, existingItems);
  }

  const explorationItems = (explorations ?? []).map((exploration) => ({
    ...exploration,
    player: playersById.get(exploration.campaign_player_id) ?? null,
    territory: territoryById.get(exploration.territory_id) ?? null,
  }));
  const battleItems = (battles ?? []).map((battle) => {
    const participants = participantsByBattleId.get(battle.id);

    return {
      ...battle,
      attacker: playersById.get(battle.attacker_campaign_player_id) ?? null,
      defender: playersById.get(battle.defender_campaign_player_id) ?? null,
      territory: territoryById.get(battle.territory_id) ?? null,
      participants: participants?.length
        ? participants
        : [
            {
              id: `${battle.id}-attacker`,
              battle_id: battle.id,
              campaign_id: battle.campaign_id,
              campaign_player_id: battle.attacker_campaign_player_id,
              order_id: battle.order_id,
              role: "attacker",
              dice_result: null,
              advantage_rank: null,
              created_at: battle.created_at,
              player:
                playersById.get(battle.attacker_campaign_player_id) ?? null,
            },
            {
              id: `${battle.id}-defender`,
              battle_id: battle.id,
              campaign_id: battle.campaign_id,
              campaign_player_id: battle.defender_campaign_player_id,
              order_id: null,
              role: "defender",
              dice_result: null,
              advantage_rank: null,
              created_at: battle.created_at,
              player:
                playersById.get(battle.defender_campaign_player_id) ?? null,
            },
          ],
    };
  });

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
  legendaryLosses: LegendaryBattleLossInput[],
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
    !battle.participants.some(
      (participant) => participant.campaign_player_id === winnerCampaignPlayerId,
    )
  ) {
    return { result: null, error: "Le vainqueur doit participer à cette bataille." };
  }

  for (const loss of legendaryLosses) {
    const participant = battle.participants.find(
      (item) => item.campaign_player_id === loss.campaign_player_id,
    );

    if (!participant) {
      return { result: null, error: "Les pertes doivent concerner un participant." };
    }

    if (!Number.isInteger(loss.dragon_losses) || loss.dragon_losses < 0) {
      return { result: null, error: "Pertes de Dragons invalides." };
    }

    if (!Number.isInteger(loss.giant_losses) || loss.giant_losses < 0) {
      return { result: null, error: "Pertes de Géants invalides." };
    }

    if (loss.dragon_losses > (participant.player?.dragon_recruits ?? 0)) {
      return { result: null, error: "Pertes de Dragons supérieures au stock." };
    }

    if (loss.giant_losses > (participant.player?.giant_recruits ?? 0)) {
      return { result: null, error: "Pertes de Géants supérieures au stock." };
    }
  }

  const { data, error: rpcError } = await supabase.rpc("resolve_battle_result", {
    target_battle_id: battleId,
    submitted_winner_campaign_player_id: winnerCampaignPlayerId,
    submitted_result_notes: resultNotes,
    submitted_legendary_losses: legendaryLosses as Json,
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

export async function finishTurn(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
) {
  if (!campaignId) {
    return { result: null, error: "Campagne introuvable." };
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

  if (!readiness.canFinishTurn) {
    const blockers = [...readiness.finishTurnBlockers];

    if (readiness.pendingExplorationCount > 0) {
      blockers.push(
        `${readiness.pendingExplorationCount} exploration(s) restent à résoudre.`,
      );
    }

    if (readiness.pendingBattleCount > 0) {
      blockers.push(
        `${readiness.pendingBattleCount} bataille(s) restent à résoudre.`,
      );
    }

    return { result: null, error: blockers.join(" ") };
  }

  const { data, error: rpcError } = await supabase.rpc("finish_current_turn", {
    target_campaign_id: campaignId,
  });

  if (rpcError) {
    return {
      result: null,
      error:
        "La fonction SQL de fin de tour n'est pas encore installée dans Supabase.",
    };
  }

  const result = data?.[0] as FinishTurnRpcResult | undefined;

  if (!result) {
    return { result: null, error: "Fin de tour impossible." };
  }

  if (!result.success) {
    return {
      result: null,
      error: result.error ?? "Fin de tour impossible.",
    };
  }

  return { result, error: null };
}
