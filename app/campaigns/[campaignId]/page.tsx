import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelOrderAction } from "@/app/campaigns/[campaignId]/orders/actions";
import { CampaignCommandCenter } from "@/components/campaign/campaign-command-center";
import { CampaignLog } from "@/components/campaign/campaign-log";
import { RevealOrdersForm } from "@/components/orders/reveal-orders-form";
import { FinishTurnForm } from "@/components/results/finish-turn-form";
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
    revealed?: string;
    battles?: string;
    explorations?: string;
    fortifications?: string;
    multi?: string;
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
      className="inline-block size-3 rounded-sm border border-[#f1dfab]/70"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

type StepState = "done" | "current" | "waiting";

function getStepCircleClasses(state: StepState) {
  if (state === "done") {
    return "border-[#6fa07e] bg-[#2f8050] text-[#f3ead7]";
  }

  if (state === "current") {
    return "border-[#d5a653] bg-[#d5a653] text-[#17100a]";
  }

  return "border-[#c89a53]/45 bg-[#eadfc9]/10 text-[#cbbda6]";
}

function getStepTitleClasses(state: StepState) {
  if (state === "current") return "text-[#f4ce73]";
  if (state === "done") return "text-[#d8f0dd]";

  return "text-[#cbbda6]";
}

type TurnProgressStepProps = {
  index: number;
  isLast: boolean;
  title: string;
  detail: string;
  state: StepState;
  children?: ReactNode;
};

function TurnProgressStep({
  index,
  isLast,
  title,
  detail,
  state,
  children,
}: TurnProgressStepProps) {
  return (
    <li className="relative min-w-0 text-center">
      {!isLast ? (
        <span
          className={`absolute top-[18px] h-px ${
            state === "done" ? "bg-[#6fa07e]" : "bg-[#c89a53]/35"
          }`}
          style={{
            left: "calc(50% + 1.125rem)",
            right: "calc(-50% + 1.125rem)",
          }}
          aria-hidden="true"
        />
      ) : null}
      <span
        className={`relative z-10 mx-auto grid size-9 place-items-center rounded-full border-2 text-sm font-bold ${getStepCircleClasses(
          state,
        )}`}
      >
        {index + 1}
      </span>
      <h3 className={`mt-3 text-sm font-bold ${getStepTitleClasses(state)}`}>
        {title}
      </h3>
      <p className="mx-auto mt-1 max-w-48 text-xs leading-5 text-[#cbbda6]">
        {detail}
      </p>
      {children ? <div className="mx-auto mt-3 max-w-52">{children}</div> : null}
    </li>
  );
}

type TurnProgressProps = {
  campaignId: string;
  currentPhase: string;
  isGameMaster: boolean;
  submittedOrderCount: number;
  activePlayerCount: number;
  battleCount: number;
  resolvedBattleCount: number;
  pendingBattleCount: number;
};

function TurnProgress({
  campaignId,
  currentPhase,
  isGameMaster,
  submittedOrderCount,
  activePlayerCount,
  battleCount,
  resolvedBattleCount,
  pendingBattleCount,
}: TurnProgressProps) {
  const allOrdersSubmitted =
    activePlayerCount > 0 && submittedOrderCount >= activePlayerCount;
  const isOrdersPhase = currentPhase === "orders";
  const isResultsPhase =
    currentPhase === "resolving" || currentPhase === "end_turn";
  const ordersState: StepState =
    !isOrdersPhase || allOrdersSubmitted
      ? "done"
      : currentPhase === "orders"
        ? "current"
        : "waiting";
  const revealState: StepState = isResultsPhase
    ? "done"
    : isOrdersPhase && allOrdersSubmitted
      ? "current"
      : "waiting";
  const resultsState: StepState = isResultsPhase ? "current" : "waiting";
  const canRevealOrders = isGameMaster && isOrdersPhase && allOrdersSubmitted;
  const canOpenResults = isGameMaster && isResultsPhase && pendingBattleCount > 0;
  const canFinishTurn = isGameMaster && isResultsPhase && pendingBattleCount === 0;
  const battleDetail = isResultsPhase
    ? battleCount > 0
      ? `${resolvedBattleCount} / ${battleCount} bataille${
          battleCount > 1 ? "s" : ""
        } résolue${resolvedBattleCount > 1 ? "s" : ""}.`
      : "Aucune bataille à résoudre pour ce tour."
    : "Les batailles apparaissent après la révélation.";

  return (
    <section className="mt-5 border-t border-[#c89a53]/35 pt-4">
      <h2 className="fantasy-panel-title text-lg font-bold">
        Progression du tour
      </h2>

      <ol className="mt-4 grid grid-cols-3 gap-2 overflow-hidden px-1 sm:px-4">
        <TurnProgressStep
          index={0}
          isLast={false}
          title="Ordres"
          detail={`${submittedOrderCount} / ${activePlayerCount} ordre${
            activePlayerCount > 1 ? "s" : ""
          } validé${submittedOrderCount > 1 ? "s" : ""}.`}
          state={ordersState}
        />

        <TurnProgressStep
          index={1}
          isLast={false}
          title="Révélation"
          detail={
            allOrdersSubmitted
              ? "Tous les ordres sont prêts."
              : "Disponible quand tous les joueurs ont validé."
          }
          state={revealState}
        >
          {canRevealOrders ? (
            <RevealOrdersForm campaignId={campaignId} returnTo="campaign" />
          ) : allOrdersSubmitted && !isGameMaster && isOrdersPhase ? (
            <p className="fantasy-muted text-xs">
              En attente du maître de campagne.
            </p>
          ) : null}
        </TurnProgressStep>

        <TurnProgressStep
          index={2}
          isLast
          title="Résultats"
          detail={battleDetail}
          state={resultsState}
        >
          {canOpenResults ? (
            <Link
              href={`/campaigns/${campaignId}/results`}
              className={buttonVariants({
                size: "sm",
                className: "fantasy-action-button w-full",
              })}
            >
              Saisir les résultats
            </Link>
          ) : null}
          {canFinishTurn ? <FinishTurnForm campaignId={campaignId} /> : null}
        </TurnProgressStep>
      </ol>
    </section>
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
    battles,
    orderVisibility,
    logs,
  } = dashboard;
  const rankedPlayers = getRankedPlayers(activePlayers);
  const territoryStats = getTerritoryStats(territories);
  const territoryNameById = new Map(
    territories.map((territory) => [territory.id, territory.name]),
  );
  const pendingBattles = battles.filter((battle) => battle.status === "pending");
  const contestedTerritoryIds = Array.from(
    new Set(pendingBattles.map((battle) => battle.territory_id)),
  );
  const pendingBattleCount = pendingBattles.length;
  const resolvedBattleCount = battles.filter((battle) =>
    ["played", "cancelled"].includes(battle.status),
  ).length;
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
    <main className="campaign-fantasy-shell min-h-screen px-4 py-8 text-[#f3ead7] sm:px-6 lg:py-10">
      <div className="campaign-fantasy-content mx-auto max-w-[1540px]">
        <header className="fantasy-panel p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href="/dashboard"
                className="fantasy-action-button inline-grid size-10 shrink-0 place-items-center rounded-full border border-[#f3e7cd]/70 bg-[#211a16]/25 text-2xl font-bold leading-none text-[#fffaf0] transition-colors hover:bg-[#211a16]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e7cd]"
                aria-label="Retour au dashboard"
              >
                <span aria-hidden="true">‹</span>
              </Link>

              <div className="min-w-0">
                <h1 className="fantasy-panel-title text-3xl font-bold tracking-normal sm:text-4xl">
                  {campaign.name}
                </h1>
                <p className="fantasy-muted mt-2 text-sm">
                  Saison {campaign.season_number} - Tour{" "}
                  {campaign.current_turn_number || 1} -{" "}
                  {currentTurn?.army_base_points ?? 400} points
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="fantasy-stat px-3 py-2">
                  <span className="block text-xs font-semibold text-[#c9a45d]">
                    Carte
                  </span>
                  <span className="font-bold text-[#f3ead7]">
                    {campaign.map_width} x {campaign.map_height}
                  </span>
                </span>
                <span className="fantasy-stat px-3 py-2">
                  <span className="block text-xs font-semibold text-[#c9a45d]">
                    Territoires
                  </span>
                  <span className="font-bold text-[#f3ead7]">
                    {territoryStats.total}
                  </span>
                </span>
                <span className="fantasy-stat px-3 py-2">
                  <span className="block text-xs font-semibold text-[#c9a45d]">
                    Neutres
                  </span>
                  <span className="font-bold text-[#f3ead7]">
                    {territoryStats.neutral}
                  </span>
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
                {campaign.status === "lobby" ? (
                  <Link
                    href={`/campaigns/${campaign.id}/lobby`}
                    className={buttonVariants({
                      size: "sm",
                      className: "fantasy-action-button",
                    })}
                  >
                    Ouvrir le lobby
                  </Link>
                ) : null}
                {!currentPlayer ? (
                  <Link
                    href={`/campaigns/join?code=${campaign.invite_code}`}
                    className={buttonVariants({
                      size: "sm",
                      className: "fantasy-action-button",
                    })}
                  >
                    Rejoindre
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {campaign.status === "active" ? (
            <TurnProgress
              campaignId={campaign.id}
              currentPhase={campaign.current_phase}
              isGameMaster={isGameMaster}
              submittedOrderCount={submittedOrderCount}
              activePlayerCount={activePlayers.length}
              battleCount={battles.length}
              resolvedBattleCount={resolvedBattleCount}
              pendingBattleCount={pendingBattleCount}
            />
          ) : null}
        </header>

        {query?.launched ? (
          <p className="fantasy-alert fantasy-alert-success mt-4 p-3 text-sm">
            Campagne lancée. La carte a été générée et le tour 1 est ouvert.
          </p>
        ) : null}
        {query?.turnFinished ? (
          <p className="fantasy-alert fantasy-alert-success mt-4 p-3 text-sm">
            Tour terminé. Le tour {query.turn || campaign.current_turn_number} est
            ouvert.
          </p>
        ) : null}
        {query?.revealed ? (
          <p className="fantasy-alert fantasy-alert-success mt-4 p-3 text-sm">
            Ordres révélés : {query.battles ?? "0"} bataille
            {Number(query.battles ?? 0) > 1 ? "s" : ""},{" "}
            {query.explorations ?? "0"} conquête
            {Number(query.explorations ?? 0) > 1 ? "s" : ""} automatique
            {Number(query.explorations ?? 0) > 1 ? "s" : ""},{" "}
            {query.fortifications ?? "0"} fortification
            {Number(query.fortifications ?? 0) > 1 ? "s" : ""}.
            {Number(query.multi ?? 0) > 0
              ? ` ${query.multi} territoire(s) déclenchent un conflit multiple.`
              : ""}
          </p>
        ) : null}
        {query?.submitted ? (
          <div className="fantasy-alert fantasy-alert-success mt-4 flex flex-col gap-3 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Ordre enregistré pour ce tour.</p>
            {canCancelOrder ? (
              <form action={cancelOrderAction}>
                <input type="hidden" name="returnTo" value="campaign" />
                <input type="hidden" name="campaignId" value={campaign.id} />
                <button
                  type="submit"
                  className={buttonVariants({
                    variant: "outlineDark",
                    size: "sm",
                    className: "fantasy-action-button",
                  })}
                >
                  Annuler l&apos;ordre
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
        {query?.cancelled ? (
          <p className="fantasy-alert fantasy-alert-info mt-4 p-3 text-sm">
            Ordre annulé. Tu peux en choisir un nouveau pour ce tour.
          </p>
        ) : null}
        {query?.error ? (
          <p className="fantasy-alert fantasy-alert-danger mt-4 p-3 text-sm">
            {query.error}
          </p>
        ) : null}

        <section className="mt-4">
          {territories.length ? (
            <CampaignCommandCenter
              campaignId={campaign.id}
              mapWidth={campaign.map_width}
              mapHeight={campaign.map_height}
              mapTemplate={campaign.map_template}
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
            <Card className="fantasy-panel">
              <CardContent className="p-4">
                <h2 className="fantasy-panel-title text-lg font-bold">
                  Carte de campagne
                </h2>
                <p className="fantasy-alert mt-2 p-4 text-sm">
                  La carte sera générée au lancement de la campagne. Ouvre le lobby
                  quand tous les joueurs sont prêts.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="fantasy-panel">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="fantasy-panel-title text-lg font-bold">
                    Joueurs et ordres
                  </h2>
                  <p className="fantasy-muted text-sm">
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
                      className="fantasy-stat grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_210px]"
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
                        <p className="mt-3 font-semibold text-[#f3ead7]">
                          {player.display_name}
                        </p>
                        <p className="fantasy-muted mt-1 text-sm">
                          {player.aos_faction ?? "Faction non renseignée"}
                        </p>
                        <p className="fantasy-muted mt-2 text-sm">
                          {controlledTerritories} territoire
                          {controlledTerritories > 1 ? "s" : ""} contrôlé
                          {controlledTerritories > 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 text-sm lg:items-end lg:text-right">
                        <div>
                          <p className="text-xl font-bold text-[#f4ce73]">
                            {player.glory}
                          </p>
                          <p className="fantasy-muted">Gloire</p>
                        </div>
                        <div className="space-y-2">
                          <Badge variant={getOrderStatusVariant(displayedStatus)}>
                            {getOrderStatusLabel(displayedStatus)}
                          </Badge>
                          <p className="fantasy-muted">
                            {getOrderVisibilitySummary(order, territoryNameById)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pendingPlayers.length ? (
                <p className="fantasy-alert fantasy-alert-info mt-3 p-3 text-sm">
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
