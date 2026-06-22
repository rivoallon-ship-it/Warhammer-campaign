import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  launchCampaignAction,
  reviewJoinRequestAction,
  setLobbyReadyStateAction,
  updateLobbySettingsAction,
} from "@/app/campaigns/[campaignId]/lobby/actions";
import { DeleteCampaignForm } from "@/components/campaign/delete-campaign-form";
import { InviteCodeCopy } from "@/components/campaign/invite-code-copy";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Select,
  buttonVariants,
} from "@/components/ui";
import { getColorLabel } from "@/lib/campaigns/join-campaign";
import {
  type CampaignPlayerRow,
  getLobbyData,
} from "@/lib/campaigns/lobby-service";
import { createClient } from "@/lib/supabase/server";

type LobbyPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    joined?: string;
    settings?: string;
    ready?: string;
    approved?: string;
    rejected?: string;
    error?: string;
  }>;
};

function formatPlayerStatus(status: string) {
  if (status === "active") return "Validé";
  if (status === "pending") return "En attente";
  return status;
}

function getFeedbackMessage(query?: Awaited<LobbyPageProps["searchParams"]>) {
  if (!query) return null;

  if (query.error) return { variant: "error" as const, text: query.error };
  if (query.joined) {
    return {
      variant: "success" as const,
      text: "Demande envoyée. Le maître de campagne doit maintenant la valider.",
    };
  }
  if (query.settings) {
    return { variant: "success" as const, text: "Réglages enregistrés." };
  }
  if (query.ready === "1") {
    return { variant: "success" as const, text: "Tu es prêt pour le lancement." };
  }
  if (query.ready === "0") {
    return { variant: "success" as const, text: "Ton statut est repassé en attente." };
  }
  if (query.approved) {
    return { variant: "success" as const, text: "Demande acceptée." };
  }
  if (query.rejected) {
    return { variant: "success" as const, text: "Demande refusée." };
  }

  return null;
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

function PlayerSummary({ player }: { player: CampaignPlayerRow }) {
  return (
    <div className="fantasy-stat flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[#f3ead7]">{player.display_name}</p>
          <Badge variant={player.role === "game_master" ? "warning" : "neutral"}>
            {player.role === "game_master" ? "Maître" : "Joueur"}
          </Badge>
        </div>
        <p className="fantasy-muted mt-1 text-sm">
          {player.aos_faction?.trim() || "Faction à renseigner"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {player.color ? (
          <Badge variant="neutral" className="gap-2">
            <ColorSwatch color={player.color} />
            {getColorLabel(player.color)}
          </Badge>
        ) : (
          <Badge variant="danger">Couleur manquante</Badge>
        )}
        {player.starting_capital_code ? (
          <Badge variant="neutral">{player.starting_capital_code}</Badge>
        ) : (
          <Badge variant="danger">Capitale manquante</Badge>
        )}
        <Badge variant={player.is_ready ? "success" : "neutral"}>
          {player.is_ready ? "Prêt" : "Pas prêt"}
        </Badge>
        <Badge variant={player.status === "active" ? "success" : "info"}>
          {formatPlayerStatus(player.status)}
        </Badge>
      </div>
    </div>
  );
}

export default async function LobbyPage({ params, searchParams }: LobbyPageProps) {
  const { campaignId } = await params;
  const query = await searchParams;
  const feedback = getFeedbackMessage(query);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/lobby`);
  }

  const { lobby } = await getLobbyData(supabase, campaignId, user.id);

  if (!lobby) {
    notFound();
  }

  const colorOptions = lobby.colorOptions.length
    ? lobby.colorOptions
    : [{ label: "Aucune couleur disponible", value: "" }];
  const capitalOptions = lobby.capitalOptions.length
    ? lobby.capitalOptions
    : [{ label: "Aucune capitale disponible", value: "" }];
  const currentPlayer = lobby.currentPlayer;
  const canEditSettings = Boolean(currentPlayer && lobby.campaign.status === "lobby");
  const canToggleReady = Boolean(
    currentPlayer?.status === "active" && lobby.campaign.status === "lobby",
  );

  return (
    <main className="campaign-fantasy-shell min-h-screen px-6 py-10 text-[#f3ead7]">
      <div className="campaign-fantasy-content mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Lobby"
          title={lobby.campaign.name}
          description="Valide les joueurs, complète les factions, couleurs et capitales, puis prépare le lancement."
        />

        {feedback ? (
          <p
            className={
              feedback.variant === "error"
                ? "fantasy-alert fantasy-alert-danger mt-6 p-3 text-sm"
                : "fantasy-alert fantasy-alert-success mt-6 p-3 text-sm"
            }
          >
            {feedback.text}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-[0.85fr_1.6fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Badge variant="lobby" className="mb-4 w-fit">
                  Code invitation
                </Badge>
                <CardTitle className="text-3xl">
                  {lobby.campaign.invite_code}
                </CardTitle>
                <CardDescription>
                  Partage ce code avec les joueurs qui doivent envoyer une
                  demande.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InviteCodeCopy code={lobby.campaign.invite_code} />
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="font-semibold text-[#f3ead7]">Joueurs</dt>
                    <dd className="fantasy-muted mt-1">
                      {lobby.activePlayers.length} / {lobby.campaign.player_count}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#f3ead7]">Demandes</dt>
                    <dd className="fantasy-muted mt-1">
                      {lobby.pendingPlayers.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#f3ead7]">Carte</dt>
                    <dd className="fantasy-muted mt-1">
                      {lobby.campaign.map_width} x {lobby.campaign.map_height}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#f3ead7]">Phase</dt>
                    <dd className="fantasy-muted mt-1">
                      {lobby.campaign.current_phase}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lancement</CardTitle>
                <CardDescription>
                  Quand tout est prêt, le lancement génère la carte et ouvre le
                  tour 1.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {lobby.launchChecks.canLaunch ? (
                  <p className="fantasy-alert fantasy-alert-success p-3 text-sm">
                    Toutes les conditions sont réunies.
                  </p>
                ) : (
                  <ul className="fantasy-muted space-y-2 text-sm">
                    {lobby.launchChecks.blockers.map((blocker) => (
                      <li
                        key={blocker}
                        className="fantasy-alert p-3"
                      >
                        {blocker}
                      </li>
                    ))}
                  </ul>
                )}
                {lobby.isGameMaster ? (
                  lobby.launchChecks.canLaunch ? (
                    <form action={launchCampaignAction}>
                      <input
                        type="hidden"
                        name="campaignId"
                        value={lobby.campaign.id}
                      />
                      <Button type="submit" className="w-full">
                        Lancer la campagne
                      </Button>
                    </form>
                  ) : (
                    <Button type="button" className="w-full" disabled>
                      Lancer la campagne
                    </Button>
                  )
                ) : (
                  <p className="fantasy-muted text-sm">
                    Seul le maître de campagne pourra lancer la campagne.
                  </p>
                )}
                {lobby.canDeleteCampaign ? (
                  <div className="border-t border-[#c89a53]/30 pt-4">
                    <p className="fantasy-muted mb-3 text-sm">
                      Le créateur peut supprimer cette campagne et toutes ses
                      données associées.
                    </p>
                    <DeleteCampaignForm
                      campaignId={lobby.campaign.id}
                      campaignName={lobby.campaign.name}
                      returnTo="lobby"
                      className="w-full"
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Joueurs actifs</CardTitle>
                <CardDescription>
                  Chaque joueur actif doit avoir une faction, une couleur, une
                  capitale et le statut prêt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lobby.activePlayers.map((player) => (
                  <PlayerSummary key={player.id} player={player} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demandes en attente</CardTitle>
                <CardDescription>
                  Le maître de campagne accepte ou refuse les joueurs avant le
                  lancement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lobby.pendingPlayers.length ? (
                  lobby.pendingPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="fantasy-stat p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <PlayerSummary player={player} />
                        {lobby.isGameMaster ? (
                          <div className="flex gap-2 sm:flex-col">
                            <form action={reviewJoinRequestAction}>
                              <input
                                type="hidden"
                                name="campaignId"
                                value={lobby.campaign.id}
                              />
                              <input
                                type="hidden"
                                name="playerId"
                                value={player.id}
                              />
                              <input type="hidden" name="decision" value="approve" />
                              <Button type="submit" size="sm">
                                Accepter
                              </Button>
                            </form>
                            <form action={reviewJoinRequestAction}>
                              <input
                                type="hidden"
                                name="campaignId"
                                value={lobby.campaign.id}
                              />
                              <input
                                type="hidden"
                                name="playerId"
                                value={player.id}
                              />
                              <input type="hidden" name="decision" value="reject" />
                              <Button type="submit" size="sm" variant="danger">
                                Refuser
                              </Button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="fantasy-muted text-sm">
                    Aucune demande en attente.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mes réglages</CardTitle>
                <CardDescription>
                  Ces informations seront utilisées pour générer les capitales
                  et afficher la carte.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {currentPlayer ? (
                  <>
                    <form action={updateLobbySettingsAction} className="space-y-4">
                      <input
                        type="hidden"
                        name="campaignId"
                        value={lobby.campaign.id}
                      />
                      <Input
                        label="Pseudo dans la campagne"
                        name="displayName"
                        required
                        disabled={!canEditSettings}
                        defaultValue={currentPlayer.display_name}
                      />
                      <Input
                        label="Faction AoS"
                        name="aosFaction"
                        required
                        disabled={!canEditSettings}
                        defaultValue={currentPlayer.aos_faction ?? ""}
                        placeholder="Ex. Stormcast Eternals, Orruk Warclans..."
                      />
                      <Select
                        label="Couleur"
                        name="color"
                        required
                        disabled={!canEditSettings}
                        defaultValue={currentPlayer.color ?? colorOptions[0]?.value}
                        options={colorOptions}
                      />
                      <Select
                        label="Capitale"
                        name="startingCapitalCode"
                        required
                        disabled={!canEditSettings}
                        defaultValue={
                          currentPlayer.starting_capital_code ??
                          capitalOptions[0]?.value
                        }
                        options={capitalOptions}
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full"
                        disabled={!canEditSettings}
                      >
                        Enregistrer mes réglages
                      </Button>
                    </form>

                    <form action={setLobbyReadyStateAction}>
                      <input
                        type="hidden"
                        name="campaignId"
                        value={lobby.campaign.id}
                      />
                      <input
                        type="hidden"
                        name="isReady"
                        value={currentPlayer.is_ready ? "false" : "true"}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        variant={currentPlayer.is_ready ? "secondary" : "primary"}
                        disabled={!canToggleReady}
                      >
                        {currentPlayer.is_ready ? "Je ne suis plus prêt" : "Je suis prêt"}
                      </Button>
                    </form>
                    {currentPlayer.status === "pending" ? (
                      <p className="fantasy-alert fantasy-alert-info p-3 text-sm">
                        Ta demande doit être acceptée avant le statut prêt.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="space-y-4">
                    <p className="fantasy-muted text-sm">
                      Tu dois rejoindre cette campagne avec son code invitation
                      avant de pouvoir régler ton joueur.
                    </p>
                    <Link
                      href={`/campaigns/join?code=${lobby.campaign.invite_code}`}
                      className={buttonVariants({ className: "w-full" })}
                    >
                      Rejoindre avec ce code
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Retour au dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
