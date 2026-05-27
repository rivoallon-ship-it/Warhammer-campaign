import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FinishTurnForm } from "@/components/results/finish-turn-form";
import { ResolveBattleForm } from "@/components/results/resolve-battle-form";
import { ResolveExplorationForm } from "@/components/results/resolve-exploration-form";
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
  getResultsPageData,
  getResultsReadiness,
} from "@/lib/resolution/results-service";
import { createClient } from "@/lib/supabase/server";

type ResultsPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    exploration?: string;
    battle?: string;
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
  if (!diceResult || success === null) return "D6 à saisir";

  return success ? `Réussite sur ${diceResult}` : `Échec sur ${diceResult}`;
}

function getBattleResultLabel(
  winnerCampaignPlayerId: string | null,
  attackerCampaignPlayerId: string,
  attackerName: string,
  defenderName: string,
) {
  if (!winnerCampaignPlayerId) return "Vainqueur à saisir";

  return winnerCampaignPlayerId === attackerCampaignPlayerId
    ? `${attackerName} conquiert`
    : `${defenderName} défend`;
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

  if (query.battle === "attacker") {
    return {
      variant: "success" as const,
      text: "Bataille résolue. Le territoire passe à l'attaquant et la Gloire a été mise à jour.",
    };
  }

  if (query.battle === "defender") {
    return {
      variant: "success" as const,
      text: "Bataille résolue. Le défenseur conserve le territoire et la Gloire a été mise à jour.",
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

  const { campaign, currentTurn, explorations, battles } = resultsData;
  const readiness = getResultsReadiness(resultsData);

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-6xl">
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
                ? "mt-6 rounded-md border border-[#c76d62] bg-[#f4d9d4] p-3 text-sm text-[#7b2922]"
                : "mt-6 rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b]"
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
                  {readiness.resolvedExplorationCount} / {explorations.length} explorations
                </Badge>
                <Badge variant="neutral">
                  {readiness.pendingBattleCount} bataille(s) en attente
                </Badge>
              </div>
              <CardTitle>Explorations</CardTitle>
              <CardDescription>
                Un résultat de 1-2 échoue, 3-6 réussit. Le joueur gagne toujours
                1 Gloire.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {explorations.length ? (
                explorations.map((exploration) => (
                  <div
                    key={exploration.id}
                    className="grid gap-4 rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 lg:grid-cols-[1fr_220px]"
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
                      <p className="mt-3 font-semibold text-[#302720]">
                        {exploration.player?.display_name ?? "Joueur inconnu"}
                      </p>
                      <p className="mt-1 text-sm text-[#6a5e54]">
                        Explore{" "}
                        {exploration.territory
                          ? `${exploration.territory.code} - ${exploration.territory.name}`
                          : "un territoire inconnu"}
                      </p>
                      {exploration.success === true ? (
                        <p className="mt-2 text-sm text-[#23543b]">
                          Territoire conquis, +1 Gloire.
                        </p>
                      ) : null}
                      {exploration.success === false ? (
                        <p className="mt-2 text-sm text-[#7b2922]">
                          Territoire non conquis, +1 Gloire.
                        </p>
                      ) : null}
                    </div>

                    {readiness.canResolveExplorations &&
                    exploration.status === "pending" ? (
                      <ResolveExplorationForm
                        campaignId={campaign.id}
                        explorationId={exploration.id}
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 text-sm text-[#6a5e54]">
                  Aucune exploration à résoudre pour ce tour.
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
                  <p className="rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b]">
                    Tu peux résoudre les explorations et batailles en attente.
                  </p>
                ) : (
                  <ul className="space-y-2 rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 text-sm text-[#6a5e54]">
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
                  battles.map((battle) => (
                    <div
                      key={battle.id}
                      className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={getStatusVariant(battle.status)}>
                          {getStatusLabel(battle.status)}
                        </Badge>
                        <Badge variant="neutral">
                          {getBattleResultLabel(
                            battle.winner_campaign_player_id,
                            battle.attacker_campaign_player_id,
                            battle.attacker?.display_name ?? "Attaquant",
                            battle.defender?.display_name ?? "Défenseur",
                          )}
                        </Badge>
                        {battle.defender_bonus ? (
                          <Badge variant="warning">Fortifié</Badge>
                        ) : null}
                      </div>
                      <p className="mt-3 font-semibold text-[#302720]">
                        {battle.territory
                          ? `${battle.territory.code} - ${battle.territory.name}`
                          : "Territoire inconnu"}
                      </p>
                      <p className="mt-1 text-sm text-[#6a5e54]">
                        {battle.attacker?.display_name ?? "Attaquant"} contre{" "}
                        {battle.defender?.display_name ?? "Défenseur"}
                      </p>
                      {battle.defender_bonus ? (
                        <p className="mt-2 text-sm text-[#644512]">
                          {battle.defender_bonus}
                        </p>
                      ) : null}
                      {battle.result_notes ? (
                        <p className="mt-2 text-sm text-[#6a5e54]">
                          Notes : {battle.result_notes}
                        </p>
                      ) : null}
                      {readiness.canResolveResults && battle.status === "pending" ? (
                        <div className="mt-4">
                          <ResolveBattleForm
                            campaignId={campaign.id}
                            battleId={battle.id}
                            attackerCampaignPlayerId={
                              battle.attacker_campaign_player_id
                            }
                            attackerName={
                              battle.attacker?.display_name ?? "Attaquant"
                            }
                            defenderCampaignPlayerId={
                              battle.defender_campaign_player_id
                            }
                            defenderName={
                              battle.defender?.display_name ?? "Défenseur"
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 text-sm text-[#6a5e54]">
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
                    <p className="rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b]">
                      Toutes les explorations et batailles du tour sont résolues.
                    </p>
                    <FinishTurnForm campaignId={campaign.id} />
                  </div>
                ) : (
                  <ul className="space-y-2 rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 text-sm text-[#6a5e54]">
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
            <Link
              href={`/campaigns/${campaign.id}/map`}
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Voir la carte
            </Link>
          </div>
        </section>

        {currentTurn ? null : (
          <p className="mt-4 rounded-md border border-[#c76d62] bg-[#f4d9d4] p-3 text-sm text-[#7b2922]">
            Aucun tour courant trouvé.
          </p>
        )}
      </div>
    </main>
  );
}
