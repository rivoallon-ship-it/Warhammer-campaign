import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelOrderAction } from "@/app/campaigns/[campaignId]/orders/actions";
import { CampaignCommandCenter } from "@/components/campaign/campaign-command-center";
import { CampaignLog } from "@/components/campaign/campaign-log";
import { Badge, Card, CardContent, buttonVariants } from "@/components/ui";
import {
  type CampaignOrderVisibilityRow,
  getCampaignDashboard,
  getOrderVisibilityByPlayerId,
  getRankedPlayers,
  getTerritoryStats,
} from "@/lib/campaigns/campaign-dashboard-service";
import { getColorLabel } from "@/lib/campaigns/join-campaign";
import { createClient } from "@/lib/supabase/server";

type CampaignPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    launched?: string;
    turnFinished?: string;
    turn?: string;
    submitted?: string;
    cancelled?: string;
    error?: string;
  }>;
};

function getOrderStatusLabel(status?: string) {
  if (!status) return "En attente";
  if (status === "pending") return "En attente";
  if (status === "draft") return "En attente";
  if (status === "submitted") return "Validé";
  if (status === "revealed") return "Révélé";
  if (status === "resolved") return "Résolu";

  return status;
}

function getOrderStatusVariant(status?: string) {
  if (status === "submitted" || status === "revealed" || status === "resolved") {
    return "success" as const;
  }

  if (status === "draft") return "neutral" as const;

  return "neutral" as const;
}

function getOrderActionLabel(actionType?: string | null) {
  if (actionType === "attack" || actionType === "explore" || actionType === "conquer") {
    return "Conquérir";
  }

  if (actionType === "fortify") return "Fortifier";

  return actionType ?? "Ordre";
}

function getPublicOrderStatus(status?: string) {
  return status === "submitted" ? "submitted" : "pending";
}

function getOrderVisibilitySummary(
  order: CampaignOrderVisibilityRow | undefined,
  territoryNameById: Map<string, string>,
) {
  if (!order || order.order_status === "pending" || order.order_status === "draft") {
    return "En attente";
  }

  if (!order.can_view_details) {
    return order.order_status === "submitted" ? "Ordre validé" : "En attente";
  }

  if (!order.action_type) {
    return "Ordre validé";
  }

  const sourceName = order.source_territory_id
    ? territoryNameById.get(order.source_territory_id)
    : null;
  const targetName = order.target_territory_id
    ? territoryNameById.get(order.target_territory_id)
    : null;

  if (order.action_type === "fortify") {
    return `${getOrderActionLabel(order.action_type)} ${
      targetName ?? "un territoire"
    }`;
  }

  return `${getOrderActionLabel(order.action_type)} ${
    targetName ?? sourceName ?? "un territoire"
  }`;
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-3 rounded-sm border border-[#c8bca7]"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export default async function CampaignPage({
  params,
  searchParams,
}: CampaignPageProps) {
  const { campaignId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}`);
  }

  const { dashboard } = await getCampaignDashboard(supabase, campaignId, user.id);

  if (!dashboard) {
    notFound();
  }

  const {
    campaign,
    currentPlayer,
    activePlayers,
    pendingPlayers,
    currentTurn,
    territories,
    adjacencies,
    orders,
    pendingBattles,
    orderVisibility,
    logs,
  } = dashboard;
  const rankedPlayers = getRankedPlayers(activePlayers);
  const territoryStats = getTerritoryStats(territories);
  const territoryNameById = new Map(
    territories.map((territory) => [territory.id, territory.name]),
  );
  const contestedTerritoryIds = Array.from(
    new Set(pendingBattles.map((battle) => battle.territory_id)),
  );
  const orderVisibilityByPlayerId =
    getOrderVisibilityByPlayerId(orderVisibility);
  const submittedOrderCount = orderVisibility.filter((order) =>
    ["submitted", "revealed", "resolved"].includes(order.order_status),
  ).length;
  const controlledTerritoryCountByPlayerId = new Map<string, number>();

  for (const territory of territories) {
    if (!territory.owner_campaign_player_id) continue;

    controlledTerritoryCountByPlayerId.set(
      territory.owner_campaign_player_id,
      (controlledTerritoryCountByPlayerId.get(territory.owner_campaign_player_id) ??
        0) + 1,
    );
  }

  const isGameMaster =
    currentPlayer?.role === "game_master" && currentPlayer.status === "active";
  const canUseCampaignActions = campaign.status === "active" && currentPlayer;
  const existingPlayerOrder =
    currentPlayer && currentTurn
      ? (orders.find((order) => order.campaign_player_id === currentPlayer.id) ?? null)
      : null;
  const visiblePlayerOrder =
    existingPlayerOrder && existingPlayerOrder.status !== "draft"
      ? existingPlayerOrder
      : null;
  const orderUnavailableMessage = !currentPlayer
    ? "Tu dois rejoindre cette campagne avant de donner un ordre."
    : currentPlayer.status !== "active"
      ? "Ton joueur n'est pas encore actif dans cette campagne."
      : campaign.status !== "active"
        ? "La campagne n'est pas encore active."
        : campaign.current_phase !== "orders"
          ? "La phase actuelle ne permet pas de modifier les ordres."
          : !currentTurn || currentTurn.phase !== "orders"
            ? "Le tour courant n'accepte pas d'ordres."
            : !territories.length
              ? "La carte n'est pas encore générée."
              : null;
  const canSubmitOrders = !orderUnavailableMessage;
  const canCancelOrder =
    canSubmitOrders &&
    Boolean(
      existingPlayerOrder &&
        ["draft", "submitted"].includes(existingPlayerOrder.status),
    );

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-lg border border-[#d8cbb7] bg-[#fffaf0] p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-normal text-[#211a16]">
                {campaign.name}
              </h1>
              <p className="mt-2 text-sm text-[#6a5e54]">
                Saison {campaign.season_number} - Tour{" "}
                {campaign.current_turn_number || 1} -{" "}
                {currentTurn?.army_base_points ?? 400} points
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 xl:grid-cols-4">
                <span className="rounded-md border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
                  <span className="block text-xs font-semibold text-[#6a5e54]">
                    Carte
                  </span>
                  <span className="font-bold text-[#302720]">
                    {campaign.map_width} x {campaign.map_height}
                  </span>
                </span>
                <span className="rounded-md border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
                  <span className="block text-xs font-semibold text-[#6a5e54]">
                    Territoires
                  </span>
                  <span className="font-bold text-[#302720]">
                    {territoryStats.total}
                  </span>
                </span>
                <span className="rounded-md border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
                  <span className="block text-xs font-semibold text-[#6a5e54]">
                    Neutres
                  </span>
                  <span className="font-bold text-[#302720]">
                    {territoryStats.neutral}
                  </span>
                </span>
                <span className="rounded-md border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
                  <span className="block text-xs font-semibold text-[#6a5e54]">
                    Ordres
                  </span>
                  <span className="font-bold text-[#302720]">
                    {submittedOrderCount} / {activePlayers.length}
                  </span>
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
                {campaign.status === "lobby" ? (
                  <Link
                    href={`/campaigns/${campaign.id}/lobby`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Ouvrir le lobby
                  </Link>
                ) : null}
                {isGameMaster && campaign.current_phase === "orders" ? (
                  <Link
                    href={`/campaigns/${campaign.id}/reveal`}
                    className={buttonVariants({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Révéler les ordres
                  </Link>
                ) : null}
                {isGameMaster && campaign.current_phase === "resolving" ? (
                  <Link
                    href={`/campaigns/${campaign.id}/results`}
                    className={buttonVariants({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Résultats
                  </Link>
                ) : null}
                {isGameMaster && campaign.current_phase === "end_turn" ? (
                  <Link
                    href={`/campaigns/${campaign.id}/results`}
                    className={buttonVariants({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Finir le tour
                  </Link>
                ) : null}
                {!currentPlayer ? (
                  <Link
                    href={`/campaigns/join?code=${campaign.invite_code}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Rejoindre
                  </Link>
                ) : null}
                <Link
                  href="/dashboard"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>

          {canUseCampaignActions ? (
            <p className="mt-4 rounded-md border border-[#eadfce] bg-[#fffdf8] p-3 text-sm text-[#6a5e54]">
              {campaign.current_phase === "orders"
                ? "Sélectionne un territoire contrôlé sur la carte pour donner ton ordre."
                : "La carte reste consultable, mais les ordres ne sont pas ouverts dans cette phase."}
            </p>
          ) : null}
        </header>

        {query?.launched ? (
          <p className="mt-4 rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b]">
            Campagne lancée. La carte a été générée et le tour 1 est ouvert.
          </p>
        ) : null}
        {query?.turnFinished ? (
          <p className="mt-4 rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b]">
            Tour terminé. Le tour {query.turn || campaign.current_turn_number} est
            ouvert.
          </p>
        ) : null}
        {query?.submitted ? (
          <div className="mt-4 flex flex-col gap-3 rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b] sm:flex-row sm:items-center sm:justify-between">
            <p>Ordre enregistré pour ce tour.</p>
            {canCancelOrder ? (
              <form action={cancelOrderAction}>
                <input type="hidden" name="returnTo" value="campaign" />
                <input type="hidden" name="campaignId" value={campaign.id} />
                <button
                  type="submit"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className:
                      "border-[#6fa07e] bg-[#f5fff7] text-[#23543b] hover:bg-[#d2ead8]",
                  })}
                >
                  Annuler l&apos;ordre
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
        {query?.cancelled ? (
          <p className="mt-4 rounded-md border border-[#7395bd] bg-[#ddeafa] p-3 text-sm text-[#284d77]">
            Ordre annulé. Tu peux en choisir un nouveau pour ce tour.
          </p>
        ) : null}
        {query?.error ? (
          <p className="mt-4 rounded-md border border-[#c76d62] bg-[#f4d9d4] p-3 text-sm text-[#7b2922]">
            {query.error}
          </p>
        ) : null}

        <section className="mt-4">
          {territories.length ? (
            <CampaignCommandCenter
              campaignId={campaign.id}
              mapWidth={campaign.map_width}
              mapHeight={campaign.map_height}
              players={activePlayers.map((player) => ({
                id: player.id,
                displayName: player.display_name,
                faction: player.aos_faction,
                color: player.color,
              }))}
              territories={territories.map((territory) => ({
                id: territory.id,
                code: territory.code,
                name: territory.name,
                type: territory.type,
                positionX: territory.position_x,
                positionY: territory.position_y,
                ownerCampaignPlayerId: territory.owner_campaign_player_id,
                isFortified: territory.is_fortified,
                localFaction: territory.local_faction,
              }))}
              adjacencies={adjacencies.map((adjacency) => ({
                territoryCode: adjacency.territory_code,
                adjacentTerritoryCode: adjacency.adjacent_territory_code,
              }))}
              contestedTerritoryIds={contestedTerritoryIds}
              currentPlayerId={currentPlayer?.id ?? null}
              canSubmitOrders={canSubmitOrders}
              unavailableMessage={orderUnavailableMessage}
              existingOrder={
                visiblePlayerOrder
                  ? {
                      actionType: visiblePlayerOrder.action_type,
                      sourceTerritoryId: visiblePlayerOrder.source_territory_id,
                      targetTerritoryId: visiblePlayerOrder.target_territory_id,
                      status: visiblePlayerOrder.status,
                    }
                  : null
              }
            />
          ) : (
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-bold text-[#302720]">
                  Carte de campagne
                </h2>
                <p className="mt-2 rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 text-sm text-[#6a5e54]">
                  La carte sera générée au lancement de la campagne. Ouvre le lobby
                  quand tous les joueurs sont prêts.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#302720]">
                    Joueurs et ordres
                  </h2>
                  <p className="text-sm text-[#6a5e54]">
                    Classement, territoire et statut du tour courant.
                  </p>
                </div>
                <Badge variant="neutral">
                  {submittedOrderCount} / {activePlayers.length} ordres
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                {rankedPlayers.map((player, index) => {
                  const controlledTerritories =
                    controlledTerritoryCountByPlayerId.get(player.id) ?? 0;
                  const order = orderVisibilityByPlayerId.get(player.id);
                  const displayedStatus = order?.can_view_details
                    ? order.order_status
                    : getPublicOrderStatus(order?.order_status);

                  return (
                    <div
                      key={player.id}
                      className="grid gap-4 rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 lg:grid-cols-[minmax(0,1fr)_210px]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="neutral">#{index + 1}</Badge>
                          {player.color ? (
                            <Badge variant="neutral" className="gap-2">
                              <ColorSwatch color={player.color} />
                              {getColorLabel(player.color)}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-3 font-semibold text-[#302720]">
                          {player.display_name}
                        </p>
                        <p className="mt-1 text-sm text-[#6a5e54]">
                          {player.aos_faction ?? "Faction non renseignée"}
                        </p>
                        <p className="mt-2 text-sm text-[#6a5e54]">
                          {controlledTerritories} territoire
                          {controlledTerritories > 1 ? "s" : ""} contrôlé
                          {controlledTerritories > 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 text-sm lg:items-end lg:text-right">
                        <div>
                          <p className="text-xl font-bold text-[#302720]">
                            {player.glory}
                          </p>
                          <p className="text-[#6a5e54]">Gloire</p>
                        </div>
                        <div className="space-y-2">
                          <Badge variant={getOrderStatusVariant(displayedStatus)}>
                            {getOrderStatusLabel(displayedStatus)}
                          </Badge>
                          <p className="text-[#6a5e54]">
                            {getOrderVisibilitySummary(order, territoryNameById)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pendingPlayers.length ? (
                <p className="mt-3 rounded-md border border-[#7395bd] bg-[#ddeafa] p-3 text-sm text-[#284d77]">
                  {pendingPlayers.length} demande
                  {pendingPlayers.length > 1 ? "s" : ""} encore en attente.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <CampaignLog logs={logs} />
        </section>
      </div>
    </main>
  );
}
