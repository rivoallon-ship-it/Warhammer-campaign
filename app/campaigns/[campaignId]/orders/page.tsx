import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderForm } from "@/components/orders/order-form";
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
  ORDER_ACTION_OPTIONS,
  getOrdersPageData,
} from "@/lib/orders/order-service";
import { createClient } from "@/lib/supabase/server";

type OrdersPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

function getPhaseLabel(phase: string) {
  if (phase === "orders") return "Ordres";
  if (phase === "lobby") return "Lobby";
  if (phase === "revealed") return "Révélée";
  if (phase === "resolving") return "Résolution";
  if (phase === "end_turn") return "Fin de tour";
  if (phase === "season_summary") return "Bilan";
  if (phase === "finished") return "Terminée";

  return phase;
}

function getStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "lobby") return "Lobby";
  if (status === "season_end") return "Fin de saison";
  if (status === "archived") return "Archivée";
  if (status === "finished") return "Terminée";

  return status;
}

function getOrderStatusLabel(status?: string) {
  if (!status) return "Aucun ordre";
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

function getFeedbackMessage(query?: Awaited<OrdersPageProps["searchParams"]>) {
  if (!query) return null;

  if (query.error) return { variant: "error" as const, text: query.error };
  if (query.submitted) {
    return { variant: "success" as const, text: "Ordre enregistré pour ce tour." };
  }

  return null;
}

export default async function OrdersPage({
  params,
  searchParams,
}: OrdersPageProps) {
  const { campaignId } = await params;
  const query = await searchParams;
  const feedback = getFeedbackMessage(query);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/orders`);
  }

  const { ordersData } = await getOrdersPageData(supabase, campaignId, user.id);

  if (!ordersData) {
    notFound();
  }

  const {
    campaign,
    currentPlayer,
    currentTurn,
    territories,
    adjacencies,
    existingOrder,
  } = ordersData;
  const controlledTerritories = currentPlayer
    ? territories.filter(
        (territory) => territory.owner_campaign_player_id === currentPlayer.id,
      )
    : [];
  const unavailableMessage = !currentPlayer
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
  const territoriesForForm = territories.map((territory) => ({
    id: territory.id,
    code: territory.code,
    name: territory.name,
    type: territory.type,
    ownerCampaignPlayerId: territory.owner_campaign_player_id,
    isFortified: territory.is_fortified,
  }));
  const adjacenciesForForm = adjacencies.map((adjacency) => ({
    territoryCode: adjacency.territory_code,
    adjacentTerritoryCode: adjacency.adjacent_territory_code,
  }));
  const existingOrderForForm = existingOrder
    ? {
        actionType: existingOrder.action_type,
        sourceTerritoryId: existingOrder.source_territory_id,
        targetTerritoryId: existingOrder.target_territory_id,
        status: existingOrder.status,
      }
    : null;

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Ordres"
          title="Ordre secret du tour"
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
                <Badge variant={campaign.status === "active" ? "active" : "lobby"}>
                  {getStatusLabel(campaign.status)}
                </Badge>
                <Badge variant="neutral">{getPhaseLabel(campaign.current_phase)}</Badge>
                <Badge variant={getOrderStatusVariant(existingOrder?.status)}>
                  {getOrderStatusLabel(existingOrder?.status)}
                </Badge>
              </div>
              <CardTitle>Choix d&apos;action</CardTitle>
              <CardDescription>
                Un seul ordre est conservé pour ton joueur sur ce tour.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unavailableMessage ? (
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 text-sm text-[#6a5e54]">
                  {unavailableMessage}
                </div>
              ) : currentPlayer ? (
                <OrderForm
                  campaignId={campaign.id}
                  currentPlayerId={currentPlayer.id}
                  actionOptions={ORDER_ACTION_OPTIONS}
                  territories={territoriesForForm}
                  adjacencies={adjacenciesForForm}
                  existingOrder={existingOrderForForm}
                />
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tour courant</CardTitle>
                <CardDescription>
                  État utile pour vérifier ton ordre avant validation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 text-sm">
                  <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                    <dt className="font-semibold text-[#302720]">Phase</dt>
                    <dd className="mt-1 text-[#5d5148]">
                      {getPhaseLabel(currentTurn?.phase ?? campaign.current_phase)}
                    </dd>
                  </div>
                  <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                    <dt className="font-semibold text-[#302720]">
                      Territoires contrôlés
                    </dt>
                    <dd className="mt-1 text-[#5d5148]">
                      {controlledTerritories.length}
                    </dd>
                  </div>
                  <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                    <dt className="font-semibold text-[#302720]">Armée</dt>
                    <dd className="mt-1 text-[#5d5148]">
                      {currentTurn?.army_base_points ?? 750} points
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/campaigns/${campaign.id}/map`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full",
                  })}
                >
                  Voir la carte
                </Link>
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full",
                  })}
                >
                  Retour à la campagne
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
