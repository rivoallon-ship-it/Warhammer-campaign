import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RevealOrdersForm } from "@/components/orders/reveal-orders-form";
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
  getRevealPageData,
  getRevealReadiness,
} from "@/lib/orders/reveal-service";
import { createClient } from "@/lib/supabase/server";

type RevealPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    revealed?: string;
    battles?: string;
    explorations?: string;
    fortifications?: string;
    multi?: string;
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

function getOrderStatusLabel(status?: string) {
  if (!status || status === "pending") return "En attente";
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

function getOrderActionLabel(actionType?: string | null) {
  if (actionType === "attack") return "Attaquer";
  if (actionType === "explore") return "Explorer";
  if (actionType === "fortify") return "Fortifier";

  return actionType ?? "Ordre";
}

function getOrderSummary(order: {
  order_status: string;
  can_view_details: boolean;
  action_type: string | null;
  source_territory_code: string | null;
  target_territory_code: string | null;
}) {
  if (order.order_status === "pending") {
    return "Aucun ordre validé";
  }

  if (!order.can_view_details) {
    return "Ordre validé, détail masqué";
  }

  if (!order.action_type) {
    return "Ordre validé";
  }

  if (order.action_type === "fortify") {
    return `${getOrderActionLabel(order.action_type)} ${
      order.target_territory_code ?? "un territoire"
    }`;
  }

  return `${getOrderActionLabel(order.action_type)} depuis ${
    order.source_territory_code ?? "?"
  } vers ${order.target_territory_code ?? "?"}`;
}

function getFeedbackMessage(query?: Awaited<RevealPageProps["searchParams"]>) {
  if (!query) return null;

  if (query.error) return { variant: "error" as const, text: query.error };

  if (query.revealed) {
    return {
      variant: "success" as const,
      text: `Ordres révélés : ${query.battles ?? "0"} bataille(s), ${
        query.explorations ?? "0"
      } exploration(s), ${query.fortifications ?? "0"} fortification(s).${
        Number(query.multi ?? 0) > 0
          ? ` ${query.multi} territoire(s) subissent plusieurs attaques.`
          : ""
      }`,
    };
  }

  return null;
}

export default async function RevealPage({
  params,
  searchParams,
}: RevealPageProps) {
  const { campaignId } = await params;
  const query = await searchParams;
  const feedback = getFeedbackMessage(query);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/reveal`);
  }

  const { revealData } = await getRevealPageData(supabase, campaignId, user.id);

  if (!revealData) {
    notFound();
  }

  const { campaign, currentTurn, activePlayers, orderVisibility } = revealData;
  const readiness = getRevealReadiness(revealData);

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Révélation"
          title="Révéler les ordres"
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

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_0.85fr]">
          <Card>
            <CardHeader>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant={campaign.current_phase === "orders" ? "active" : "neutral"}>
                  {getPhaseLabel(campaign.current_phase)}
                </Badge>
                <Badge variant="neutral">
                  {readiness.submittedOrderCount} / {readiness.activePlayerCount} ordres
                </Badge>
              </div>
              <CardTitle>Statut des joueurs</CardTitle>
              <CardDescription>
                Les détails restent masqués jusqu&apos;à la révélation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activePlayers.map((player) => {
                const order = orderVisibility.find(
                  (visibility) => visibility.campaign_player_id === player.id,
                );

                return (
                  <div
                    key={player.id}
                    className="flex flex-col justify-between gap-3 rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-semibold text-[#302720]">
                        {player.display_name}
                      </p>
                      <p className="mt-1 text-sm text-[#6a5e54]">
                        {order ? getOrderSummary(order) : "En attente"}
                      </p>
                    </div>
                    <Badge variant={getOrderStatusVariant(order?.order_status)}>
                      {getOrderStatusLabel(order?.order_status)}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Action maître</CardTitle>
                <CardDescription>
                  La révélation ouvre la phase de résolution du tour.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {readiness.canReveal ? (
                  <RevealOrdersForm campaignId={campaign.id} />
                ) : (
                  <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                    <p className="text-sm font-semibold text-[#302720]">
                      Révélation indisponible
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-[#6a5e54]">
                      {readiness.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {readiness.missingPlayers.length ? (
                  <div className="rounded-md border border-[#c99a3d] bg-[#f7e7bf] p-4 text-sm text-[#644512]">
                    En attente :{" "}
                    {readiness.missingPlayers
                      .map((player) => player.display_name)
                      .join(", ")}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Effets</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 text-sm">
                  <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                    <dt className="font-semibold text-[#302720]">Phase actuelle</dt>
                    <dd className="mt-1 text-[#5d5148]">
                      {getPhaseLabel(currentTurn?.phase ?? campaign.current_phase)}
                    </dd>
                  </div>
                  <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                    <dt className="font-semibold text-[#302720]">Après révélation</dt>
                    <dd className="mt-1 text-[#5d5148]">
                      Batailles, explorations et fortifications sont générées.
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Link
              href={`/campaigns/${campaign.id}`}
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Retour à la campagne
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
