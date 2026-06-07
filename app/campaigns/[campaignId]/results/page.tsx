import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FinishTurnForm } from "@/components/results/finish-turn-form";
import { LegendaryCommitmentForm } from "@/components/results/legendary-commitment-form";
import { ResolveBattleForm } from "@/components/results/resolve-battle-form";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  buttonVariants,
} from "@/components/ui";
import {
  getLegendaryCommitmentsOnOtherBattles,
  getResultsPageData,
  getResultsReadiness,
} from "@/lib/resolution/results-service";
import {
  DEFENSIVE_ARMY_BONUS,
  getPlayerTerritoryRuleStats,
  getVillageArmyBonus,
  hasDefensiveArmyPointsBonus,
  type PlayerTerritoryRuleStats,
} from "@/lib/campaigns/territory-rules";
import {
  getLegendaryCommitmentArmyPoints,
  getLegendaryRecruitsSummary,
} from "@/lib/campaigns/recruitment-rules";
import { createClient } from "@/lib/supabase/server";

type ResultsPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    exploration?: string;
    battle?: string;
    commitment?: string;
    error?: string;
  }>;
};

function getPhaseLabel(phase: string) {
  if (phase === "orders") return "Ordres";
  if (phase === "revealed") return "Révélée";
  if (phase === "resolving") return "Résolution";
  if (phase === "end_turn") return "Fin de tour";
  if (phase === "season_summary") return "Bilan";

  return phase;
}

function getStatusLabel(status: string) {
  if (status === "pending") return "En attente";
  if (status === "resolved") return "Résolu";
  if (status === "played") return "Jouée";
  if (status === "cancelled") return "Annulée";

  return status;
}

function getStatusVariant(status: string) {
  if (status === "resolved" || status === "played") return "success" as const;
  if (status === "cancelled") return "warning" as const;

  return "neutral" as const;
}

function getExplorationResultLabel(
  diceResult: number | null,
  success: boolean | null,
) {
  if (!diceResult || success === null) return "D6 automatique";

  return success ? `Réussite sur ${diceResult}` : `Échec sur ${diceResult}`;
}

type BattleParticipantSummary = {
  campaign_player_id: string;
  role: string;
  dice_result: number | null;
  advantage_rank: number | null;
  dragon_recruits_committed: number;
  giant_recruits_committed: number;
  player: {
    display_name: string;
    dragon_recruits: number;
    giant_recruits: number;
  } | null;
};

function getParticipantName(participant: BattleParticipantSummary) {
  return participant.player?.display_name ?? "Participant inconnu";
}

function getParticipantRoleLabel(role: string) {
  if (role === "attacker") return "Attaquant";
  if (role === "defender") return "Défenseur";
  if (role === "contender") return "Prétendant";

  return role;
}

function getBattleResultLabel(
  winnerCampaignPlayerId: string | null,
  participants: BattleParticipantSummary[],
) {
  if (!winnerCampaignPlayerId) return "Vainqueur à saisir";

  const winner = participants.find(
    (participant) => participant.campaign_player_id === winnerCampaignPlayerId,
  );

  return `${winner ? getParticipantName(winner) : "Vainqueur"} l'emporte`;
}

function getBattleParticipantsLabel(participants: BattleParticipantSummary[]) {
  return participants.map(getParticipantName).join(" contre ");
}

function getBestDiceLabel(participants: BattleParticipantSummary[]) {
  const bestParticipant = participants.find(
    (participant) => participant.advantage_rank === 1 && participant.dice_result,
  );

  if (!bestParticipant?.dice_result) return null;

  return `${getParticipantName(bestParticipant)} a l'avantage sur D6 ${bestParticipant.dice_result}.`;
}

function getParticipantArmyPoints(
  battleArmyBasePoints: number,
  participant: BattleParticipantSummary,
  stats: PlayerTerritoryRuleStats,
  hasDefenderBonus: boolean,
) {
  const villageBonus = getVillageArmyBonus(stats.villageCount);
  const defenderBonus =
    hasDefenderBonus && participant.role === "defender" ? DEFENSIVE_ARMY_BONUS : 0;
  const legendaryBonus = getLegendaryCommitmentArmyPoints(
    participant.dragon_recruits_committed,
    participant.giant_recruits_committed,
  );

  return {
    total: battleArmyBasePoints + villageBonus + defenderBonus + legendaryBonus,
    villageBonus,
    defenderBonus,
    legendaryBonus,
  };
}

function getFeedbackMessage(query?: Awaited<ResultsPageProps["searchParams"]>) {
  if (!query) return null;

  if (query.error) return { variant: "error" as const, text: query.error };

  if (query.exploration === "success") {
    return {
      variant: "success" as const,
      text: "Exploration réussie. Le territoire et la Gloire ont été mis à jour.",
    };
  }

  if (query.exploration === "failure") {
    return {
      variant: "success" as const,
      text: "Exploration échouée. La Gloire du joueur a été mise à jour.",
    };
  }

  if (query.battle === "resolved") {
    return {
      variant: "success" as const,
      text: "Bataille résolue. Le territoire et la Gloire ont été mis à jour.",
    };
  }

  if (query.commitment === "updated") {
    return {
      variant: "success" as const,
      text: "Renforts légendaires engagés pour cette bataille.",
    };
  }

  return null;
}

export default async function ResultsPage({
  params,
  searchParams,
}: ResultsPageProps) {
  const { campaignId } = await params;
  const query = await searchParams;
  const feedback = getFeedbackMessage(query);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/results`);
  }

  const { resultsData } = await getResultsPageData(supabase, campaignId, user.id);

  if (!resultsData) {
    notFound();
  }

  const { campaign, currentPlayer, currentTurn, explorations, battles } =
    resultsData;
  const readiness = getResultsReadiness(resultsData);
  const playerTerritoryRuleStats = getPlayerTerritoryRuleStats(
    resultsData.territories,
  );

  return (
    <main className="campaign-fantasy-shell min-h-screen px-6 py-10 text-[#f3ead7]">
      <div className="campaign-fantasy-content mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Résolution"
          title="Résultats du tour"
          description={`${campaign.name} - saison ${campaign.season_number}, tour ${
            campaign.current_turn_number || 1
          }.`}
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

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
          <Card>
            <CardHeader>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant={campaign.current_phase === "resolving" ? "active" : "neutral"}>
                  {getPhaseLabel(campaign.current_phase)}
                </Badge>
                <Badge variant="neutral">
                  {readiness.resolvedExplorationCount} / {explorations.length} conquêtes
                </Badge>
                <Badge variant="neutral">
                  {readiness.pendingBattleCount} bataille(s) en attente
                </Badge>
              </div>
              <CardTitle>Conquêtes automatiques</CardTitle>
              <CardDescription>
                Les D6 sont lancés automatiquement à la révélation. La difficulté
                descend à 2+ avec deux soutiens adjacents, puis devient automatique
                avec trois soutiens ou plus. Le joueur gagne toujours 1 Gloire.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {explorations.length ? (
                explorations.map((exploration) => (
                  <div
                    key={exploration.id}
                    className="fantasy-stat p-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusVariant(exploration.status)}>
                          {getStatusLabel(exploration.status)}
                        </Badge>
                        <Badge variant="neutral">
                          {getExplorationResultLabel(
                            exploration.dice_result,
                            exploration.success,
                          )}
                        </Badge>
                      </div>
                      <p className="mt-3 font-semibold text-[#f3ead7]">
                        {exploration.player?.display_name ?? "Joueur inconnu"}
                      </p>
                      <p className="fantasy-muted mt-1 text-sm">
                        Tente de conquérir{" "}
                        {exploration.territory
                          ? `${exploration.territory.code} - ${exploration.territory.name}`
                          : "un territoire inconnu"}
                      </p>
                      {exploration.success === true ? (
                        <p className="mt-2 text-sm text-[#bfe7c7]">
                          Territoire conquis, +1 Gloire.
                        </p>
                      ) : null}
                      {exploration.success === false ? (
                        <p className="mt-2 text-sm text-[#ffd8c9]">
                          Territoire non conquis, +1 Gloire.
                        </p>
                      ) : null}
                    </div>

                    {exploration.status === "pending" ? (
                      <p className="mt-2 text-sm text-[#ffd8c9]">
                        Cette ancienne exploration est encore en attente. Révèle à
                        nouveau les ordres sur une campagne mise à jour pour
                        utiliser les D6 automatiques.
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="fantasy-alert p-4 text-sm">
                  Aucune conquête automatique pour ce tour.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Accès maître</CardTitle>
                <CardDescription>
                  Les résultats ne sont modifiables que pendant la phase de
                  résolution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {readiness.canResolveResults ? (
                  <p className="fantasy-alert fantasy-alert-success p-3 text-sm">
                    Tu peux résoudre les batailles en attente.
                  </p>
                ) : (
                  <ul className="fantasy-alert space-y-2 p-4 text-sm">
                    {readiness.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Batailles</CardTitle>
                <CardDescription>
                  Choisis le vainqueur, puis applique la Gloire et la conquête.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {battles.length ? (
                  battles.map((battle) => {
                    const currentPlayerParticipant = currentPlayer
                      ? battle.participants.find(
                          (participant) =>
                            participant.campaign_player_id === currentPlayer.id,
                        )
                      : null;
                    const otherCommitments =
                      currentPlayer && currentPlayerParticipant
                        ? getLegendaryCommitmentsOnOtherBattles(
                            battles,
                            currentPlayer.id,
                            battle.id,
                          )
                        : {
                            dragonRecruitsCommitted: 0,
                            giantRecruitsCommitted: 0,
                          };
                    const maxDragonRecruits = currentPlayer
                      ? Math.max(
                          currentPlayer.dragon_recruits -
                            otherCommitments.dragonRecruitsCommitted,
                          0,
                        )
                      : 0;
                    const maxGiantRecruits = currentPlayer
                      ? Math.max(
                          currentPlayer.giant_recruits -
                            otherCommitments.giantRecruitsCommitted,
                          0,
                        )
                      : 0;

                    return (
                    <div
                      key={battle.id}
                      className="fantasy-stat p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={getStatusVariant(battle.status)}>
                          {getStatusLabel(battle.status)}
                        </Badge>
                        <Badge variant="neutral">
                          {getBattleResultLabel(
                            battle.winner_campaign_player_id,
                            battle.participants,
                          )}
                        </Badge>
                        {battle.defender_bonus ? (
                          <Badge variant="warning">Bonus</Badge>
                        ) : null}
                      </div>
                      <p className="mt-3 font-semibold text-[#f3ead7]">
                        {battle.territory
                          ? `${battle.territory.code} - ${battle.territory.name}`
                          : "Territoire inconnu"}
                      </p>
                      <p className="fantasy-muted mt-1 text-sm">
                        {getBattleParticipantsLabel(battle.participants)}
                      </p>
                      {getBestDiceLabel(battle.participants) ? (
                        <p className="mt-2 text-sm text-[#d8e8ff]">
                          {getBestDiceLabel(battle.participants)}
                        </p>
                      ) : null}
                      <ul className="fantasy-muted mt-3 space-y-2 text-sm">
                        {battle.participants.map((participant) => (
                          (() => {
                            const armyPoints = getParticipantArmyPoints(
                              battle.army_base_points,
                              participant,
                              playerTerritoryRuleStats.get(
                                participant.campaign_player_id,
                              ) ?? {
                                controlledCount: 0,
                                villageCount: 0,
                                mineCount: 0,
                              },
                              hasDefensiveArmyPointsBonus(battle.defender_bonus),
                            );
                            const legendaryCommittedSummary =
                              getLegendaryRecruitsSummary(
                                participant.dragon_recruits_committed,
                                participant.giant_recruits_committed,
                              );

                            return (
                              <li
                                key={participant.id}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <Badge variant="neutral">
                                  {getParticipantRoleLabel(participant.role)}
                                </Badge>
                                <span>{getParticipantName(participant)}</span>
                                <Badge variant="info">
                                  Armée {armyPoints.total} pts
                                </Badge>
                                {armyPoints.villageBonus > 0 ? (
                                  <Badge variant="neutral">
                                    +{armyPoints.villageBonus} villages
                                  </Badge>
                                ) : null}
                                {armyPoints.defenderBonus > 0 ? (
                                  <Badge variant="warning">
                                    +{armyPoints.defenderBonus} défense
                                  </Badge>
                                ) : null}
                                {armyPoints.legendaryBonus > 0 ? (
                                  <Badge variant="warning">
                                    +{armyPoints.legendaryBonus} légendaires
                                  </Badge>
                                ) : null}
                                {participant.dice_result ? (
                                  <Badge variant="info">
                                    D6 {participant.dice_result}
                                  </Badge>
                                ) : null}
                                {legendaryCommittedSummary ? (
                                  <Badge variant="warning">
                                    Engagés : {legendaryCommittedSummary}
                                  </Badge>
                                ) : null}
                              </li>
                            );
                          })()
                        ))}
                      </ul>
                      {battle.defender_bonus ? (
                        <p className="mt-2 text-sm text-[#f7d78a]">
                          {battle.defender_bonus}
                        </p>
                      ) : null}
                      {battle.result_notes ? (
                        <p className="fantasy-muted mt-2 text-sm">
                          Notes : {battle.result_notes}
                        </p>
                      ) : null}
                      {currentPlayerParticipant && battle.status === "pending" ? (
                        <div className="mt-4">
                          <LegendaryCommitmentForm
                            campaignId={campaign.id}
                            battleId={battle.id}
                            dragonRecruitsCommitted={
                              currentPlayerParticipant.dragon_recruits_committed
                            }
                            giantRecruitsCommitted={
                              currentPlayerParticipant.giant_recruits_committed
                            }
                            maxDragonRecruits={maxDragonRecruits}
                            maxGiantRecruits={maxGiantRecruits}
                          />
                        </div>
                      ) : null}
                      {readiness.canResolveResults && battle.status === "pending" ? (
                        <div className="mt-4">
                          <ResolveBattleForm
                            campaignId={campaign.id}
                            battleId={battle.id}
                            participants={battle.participants.map((participant) => ({
                              campaignPlayerId: participant.campaign_player_id,
                              name: getParticipantName(participant),
                              dragonRecruitsCommitted:
                                participant.dragon_recruits_committed,
                              giantRecruitsCommitted:
                                participant.giant_recruits_committed,
                            }))}
                          />
                        </div>
                      ) : null}
                    </div>
                    );
                  })
                ) : (
                  <p className="fantasy-alert p-4 text-sm">
                    Aucune bataille à résoudre pour ce tour.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fin de tour</CardTitle>
                <CardDescription>
                  Ouvre le tour suivant quand tous les résultats sont saisis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {readiness.canFinishTurn ? (
                  <div className="space-y-3">
                    <p className="fantasy-alert fantasy-alert-success p-3 text-sm">
                      Toutes les explorations et batailles du tour sont résolues.
                    </p>
                    <FinishTurnForm campaignId={campaign.id} />
                  </div>
                ) : (
                  <ul className="fantasy-alert space-y-2 p-4 text-sm">
                    {readiness.finishTurnBlockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                    {readiness.pendingExplorationCount > 0 ? (
                      <li>
                        {readiness.pendingExplorationCount} exploration(s) restent
                        à résoudre.
                      </li>
                    ) : null}
                    {readiness.pendingBattleCount > 0 ? (
                      <li>
                        {readiness.pendingBattleCount} bataille(s) restent à
                        résoudre.
                      </li>
                    ) : null}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Link
              href={`/campaigns/${campaign.id}`}
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Retour à la campagne
            </Link>
          </div>
        </section>

        {currentTurn ? null : (
          <p className="fantasy-alert fantasy-alert-danger mt-4 p-3 text-sm">
            Aucun tour courant trouvé.
          </p>
        )}
      </div>
    </main>
  );
}
