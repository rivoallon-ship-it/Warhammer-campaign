import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  buttonVariants,
} from "@/components/ui";
import {
  getCampaignDashboard,
  getPlayerById,
  getRankedPlayers,
  getTerritoryStats,
  getVisibleOrderByPlayerId,
} from "@/lib/campaigns/campaign-dashboard-service";
import { getColorLabel } from "@/lib/campaigns/join-campaign";
import { createClient } from "@/lib/supabase/server";

type CampaignPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    launched?: string;
  }>;
};

function getStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "lobby") return "Lobby";
  if (status === "season_end") return "Fin de saison";
  if (status === "archived") return "Archivée";
  if (status === "finished") return "Terminée";

  return status;
}

function getPhaseLabel(phase: string) {
  if (phase === "orders") return "Ordres";
  if (phase === "lobby") return "Lobby";
  if (phase === "revealed") return "Révélée";
  if (phase === "resolving") return "Résolution";
  if (phase === "end_turn") return "Fin de tour";
  if (phase === "season_summary") return "Bilan";

  return phase;
}

function getTerritoryTypeLabel(type: string) {
  if (type === "capital") return "Capitale";
  if (type === "village") return "Village";
  if (type === "ruins") return "Ruines";
  if (type === "fort") return "Fort";
  if (type === "magic_tower") return "Tour";
  if (type === "dragon") return "Dragon";
  if (type === "giant") return "Géant";
  if (type === "wild") return "Sauvage";

  return type;
}

function getOrderStatusLabel(status?: string) {
  if (!status) return "En attente";
  if (status === "draft") return "Brouillon";
  if (status === "submitted") return "Validé";
  if (status === "revealed") return "Révélé";
  if (status === "resolved") return "Résolu";

  return status;
}

function getOrderStatusVariant(status?: string) {
  if (status === "submitted" || status === "revealed" || status === "resolved") {
    return "success" as const;
  }

  if (status === "draft") return "warning" as const;

  return "neutral" as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
    orders,
    logs,
  } = dashboard;
  const playersById = getPlayerById(activePlayers);
  const rankedPlayers = getRankedPlayers(activePlayers);
  const territoryStats = getTerritoryStats(territories);
  const visibleOrderByPlayerId = getVisibleOrderByPlayerId(orders);
  const submittedOrderCount = activePlayers.filter((player) => {
    const order = visibleOrderByPlayerId.get(player.id);
    return ["submitted", "revealed", "resolved"].includes(order?.status ?? "");
  }).length;
  const isGameMaster =
    currentPlayer?.role === "game_master" && currentPlayer.status === "active";
  const canUseCampaignActions = campaign.status === "active" && currentPlayer;

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Campagne"
          title={campaign.name}
          description="Vue de pilotage du tour courant, des joueurs, de la carte et de l’historique."
        />

        {query?.launched ? (
          <p className="mt-6 rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b]">
            Campagne lancée. La carte a été générée et le tour 1 est ouvert.
          </p>
        ) : null}

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.45fr_0.9fr]">
          <Card>
            <CardHeader>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant={campaign.status === "active" ? "active" : "lobby"}>
                  {getStatusLabel(campaign.status)}
                </Badge>
                <Badge variant="neutral">{getPhaseLabel(campaign.current_phase)}</Badge>
                {currentPlayer ? (
                  <Badge variant={isGameMaster ? "warning" : "neutral"}>
                    {isGameMaster ? "Maître" : "Joueur"}
                  </Badge>
                ) : null}
              </div>
              <CardTitle>
                Saison {campaign.season_number} — Tour{" "}
                {campaign.current_turn_number || 1}
              </CardTitle>
              <CardDescription>
                Armées à {currentTurn?.army_base_points ?? 750} points pour le
                tour courant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-4">
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                  <dt className="font-semibold text-[#302720]">Carte</dt>
                  <dd className="mt-1 text-[#5d5148]">
                    {campaign.map_width} x {campaign.map_height}
                  </dd>
                </div>
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                  <dt className="font-semibold text-[#302720]">Territoires</dt>
                  <dd className="mt-1 text-[#5d5148]">{territoryStats.total}</dd>
                </div>
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                  <dt className="font-semibold text-[#302720]">Neutres</dt>
                  <dd className="mt-1 text-[#5d5148]">{territoryStats.neutral}</dd>
                </div>
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                  <dt className="font-semibold text-[#302720]">Ordres</dt>
                  <dd className="mt-1 text-[#5d5148]">
                    {submittedOrderCount} / {activePlayers.length}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Les actions disponibles suivent la phase de campagne.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.status === "lobby" ? (
                <Link
                  href={`/campaigns/${campaign.id}/lobby`}
                  className={buttonVariants({ className: "w-full" })}
                >
                  Ouvrir le lobby
                </Link>
              ) : null}
              {canUseCampaignActions ? (
                <>
                  <Button type="button" className="w-full" disabled>
                    Donner mes ordres
                  </Button>
                  <Button type="button" variant="outline" className="w-full" disabled>
                    Voir la carte
                  </Button>
                </>
              ) : null}
              {isGameMaster && campaign.current_phase === "orders" ? (
                <Button type="button" variant="secondary" className="w-full" disabled>
                  Révéler les ordres
                </Button>
              ) : null}
              {isGameMaster && campaign.current_phase === "resolving" ? (
                <Button type="button" variant="secondary" className="w-full" disabled>
                  Saisir les résultats
                </Button>
              ) : null}
              {isGameMaster && campaign.current_phase === "end_turn" ? (
                <Button type="button" variant="secondary" className="w-full" disabled>
                  Finir le tour
                </Button>
              ) : null}
              {!currentPlayer ? (
                <Link
                  href={`/campaigns/join?code=${campaign.invite_code}`}
                  className={buttonVariants({ className: "w-full" })}
                >
                  Rejoindre cette campagne
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                Retour au dashboard
              </Link>
            </CardContent>
          </Card>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Carte miniature</CardTitle>
              <CardDescription>
                Aperçu compact des propriétaires, types et fortifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {territories.length ? (
                <div className="overflow-x-auto pb-1">
                  <div
                    className="grid min-w-[360px] gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${campaign.map_width}, minmax(54px, 1fr))`,
                    }}
                  >
                    {territories.map((territory) => {
                      const owner = territory.owner_campaign_player_id
                        ? playersById.get(territory.owner_campaign_player_id)
                        : null;
                      const borderColor = owner?.color ?? "#d8cbb7";
                      const backgroundColor = owner?.color
                        ? `${owner.color}22`
                        : "#f2eee5";

                      return (
                        <div
                          key={territory.id}
                          className="min-h-20 rounded-md border bg-[#fffdf8] p-2 text-xs"
                          style={{ borderColor, backgroundColor }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#302720]">
                              {territory.code}
                            </span>
                            {territory.is_fortified ? (
                              <span className="font-semibold text-[#5b3c0a]">F</span>
                            ) : null}
                          </div>
                          <p className="mt-2 truncate font-semibold text-[#302720]">
                            {getTerritoryTypeLabel(territory.type)}
                          </p>
                          <p className="mt-1 truncate text-[#5d5148]">
                            {owner?.display_name ?? "Neutre"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 text-sm text-[#6a5e54]">
                  La carte sera générée au lancement de la campagne.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classement</CardTitle>
              <CardDescription>
                Gloire actuelle et territoires contrôlés par joueur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rankedPlayers.map((player, index) => {
                const controlledTerritories = territories.filter(
                  (territory) => territory.owner_campaign_player_id === player.id,
                ).length;

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-[#eadfce] bg-[#fffdf8] p-4"
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
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-xl font-bold text-[#302720]">
                        {player.glory}
                      </p>
                      <p className="text-[#6a5e54]">Gloire</p>
                      <p className="mt-2 text-[#6a5e54]">
                        {controlledTerritories} territoire
                        {controlledTerritories > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              {pendingPlayers.length ? (
                <p className="rounded-md border border-[#7395bd] bg-[#ddeafa] p-3 text-sm text-[#284d77]">
                  {pendingPlayers.length} demande
                  {pendingPlayers.length > 1 ? "s" : ""} encore en attente.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Statut des ordres</CardTitle>
              <CardDescription>
                Suivi du tour courant pour les joueurs actifs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activePlayers.map((player) => {
                const order = visibleOrderByPlayerId.get(player.id);

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-[#eadfce] bg-[#fffdf8] p-4"
                  >
                    <div>
                      <p className="font-semibold text-[#302720]">
                        {player.display_name}
                      </p>
                      <p className="mt-1 text-sm text-[#6a5e54]">
                        {order?.action_type ?? "Aucun ordre visible"}
                      </p>
                    </div>
                    <Badge variant={getOrderStatusVariant(order?.status)}>
                      {getOrderStatusLabel(order?.status)}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historique récent</CardTitle>
              <CardDescription>
                Derniers événements enregistrés sur la campagne.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {logs.length ? (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4"
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <p className="font-semibold text-[#302720]">{log.title}</p>
                      <Badge variant="neutral">{formatDate(log.created_at)}</Badge>
                    </div>
                    {log.description ? (
                      <p className="mt-2 text-sm text-[#6a5e54]">
                        {log.description}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 text-sm text-[#6a5e54]">
                  Aucun événement enregistré pour le moment.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
