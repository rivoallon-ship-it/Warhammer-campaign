import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  type CampaignDashboardData,
  getCampaignDashboard,
} from "@/lib/campaigns/campaign-dashboard-service";
import type { Database } from "@/types/database";

export type RevealRpcResult =
  Database["public"]["Functions"]["reveal_current_turn_orders"]["Returns"][number];

export type RevealPageData = CampaignDashboardData;

export function getRevealRpcErrorMessage(rpcError: {
  code?: string;
  message?: string;
}) {
  const message = rpcError.message ?? "";

  if (
    rpcError.code === "PGRST202" ||
    message.toLowerCase().includes("could not find the function") ||
    message.toLowerCase().includes("function public.reveal_current_turn_orders")
  ) {
    return "La fonction SQL de révélation n'est pas encore installée dans Supabase.";
  }

  return `Erreur SQL pendant la révélation : ${message || "erreur inconnue"}`;
}

export function getRevealReadiness(revealData: RevealPageData) {
  const { campaign, currentPlayer, currentTurn, activePlayers, orderVisibility } =
    revealData;
  const isGameMaster =
    currentPlayer?.role === "game_master" && currentPlayer.status === "active";
  const isActiveMember = currentPlayer?.status === "active";
  const submittedOrders = orderVisibility.filter((order) =>
    ["submitted", "revealed", "resolved"].includes(order.order_status),
  );
  const missingPlayers = activePlayers.filter((player) => {
    const order = orderVisibility.find(
      (visibility) => visibility.campaign_player_id === player.id,
    );

    return !["submitted", "revealed", "resolved"].includes(
      order?.order_status ?? "pending",
    );
  });
  const blockers: string[] = [];

  if (!isActiveMember) {
    blockers.push("Tu dois être joueur actif pour révéler les ordres.");
  }

  if (campaign.status !== "active" || campaign.current_phase !== "orders") {
    blockers.push("La campagne doit être active et en phase ordres.");
  }

  if (!currentTurn || currentTurn.phase !== "orders") {
    blockers.push("Le tour courant doit être en phase ordres.");
  }

  if (activePlayers.length === 0) {
    blockers.push("Aucun joueur actif dans cette campagne.");
  }

  if (submittedOrders.length !== activePlayers.length) {
    blockers.push("Tous les joueurs actifs doivent avoir validé leur ordre.");
  }

  return {
    canReveal: blockers.length === 0,
    blockers,
    isGameMaster,
    activePlayerCount: activePlayers.length,
    submittedOrderCount: submittedOrders.length,
    missingPlayers,
  };
}

export async function getRevealPageData(
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
    return { revealData: null, error: error ?? "Campagne introuvable." };
  }

  return { revealData: dashboard, error: null };
}

export async function revealOrders(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
) {
  const { revealData, error } = await getRevealPageData(
    supabase,
    campaignId,
    user.id,
  );

  if (error || !revealData) {
    return { result: null, error: error ?? "Campagne introuvable." };
  }

  const readiness = getRevealReadiness(revealData);

  if (!readiness.canReveal) {
    return { result: null, error: readiness.blockers.join(" ") };
  }

  const { data, error: rpcError } = await supabase.rpc(
    "reveal_current_turn_orders",
    {
      target_campaign_id: campaignId,
    },
  );

  if (rpcError) {
    return {
      result: null,
      error: getRevealRpcErrorMessage(rpcError),
    };
  }

  const result = data?.[0] as RevealRpcResult | undefined;

  if (!result) {
    return { result: null, error: "Révélation impossible." };
  }

  if (!result.success) {
    return {
      result: null,
      error: result.error ?? "Révélation impossible.",
    };
  }

  return { result, error: null };
}
