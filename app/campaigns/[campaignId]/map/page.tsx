import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CampaignMapView } from "@/components/map/campaign-map-view";
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
import { getCampaignMapData } from "@/lib/maps/map-service";
import { createClient } from "@/lib/supabase/server";

type CampaignMapPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

function getPhaseLabel(phase: string) {
  if (phase === "orders") return "Ordres";
  if (phase === "lobby") return "Lobby";
  if (phase === "revealed") return "Révélée";
  if (phase === "resolving") return "Résolution";
  if (phase === "end_turn") return "Fin de tour";

  return phase;
}

export default async function CampaignMapPage({ params }: CampaignMapPageProps) {
  const { campaignId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/map`);
  }

  const { mapData } = await getCampaignMapData(supabase, campaignId, user.id);

  if (!mapData) {
    notFound();
  }

  const { campaign, currentPlayer, players, territories, adjacencies } = mapData;

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Carte"
          title={campaign.name}
          description="Territoires, propriétaires, fortifications et adjacences de la campagne."
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant={campaign.status === "active" ? "active" : "lobby"}>
            {campaign.status === "active" ? "Active" : "Lobby"}
          </Badge>
          <Badge variant="neutral">{getPhaseLabel(campaign.current_phase)}</Badge>
          {currentPlayer ? (
            <Badge variant={currentPlayer.role === "game_master" ? "warning" : "neutral"}>
              {currentPlayer.role === "game_master" ? "Maître" : "Joueur"}
            </Badge>
          ) : null}
          <Badge variant="neutral">
            {campaign.map_width} x {campaign.map_height}
          </Badge>
        </div>

        <div className="mt-6">
          {territories.length ? (
            <CampaignMapView
              mapWidth={campaign.map_width}
              mapHeight={campaign.map_height}
              players={players
                .filter((player) => player.status === "active")
                .map((player) => ({
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
            />
          ) : (
            <Card>
              <CardHeader>
                <Badge variant="warning" className="mb-4 w-fit">
                  Carte vide
                </Badge>
                <CardTitle>La carte n’a pas encore été générée</CardTitle>
                <CardDescription>
                  Elle sera créée automatiquement au lancement de la campagne.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/campaigns/${campaign.id}/lobby`}
                  className={buttonVariants()}
                >
                  Ouvrir le lobby
                </Link>
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Retour à la campagne
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {territories.length ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/campaigns/${campaign.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Retour à la campagne
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "outline" })}
            >
              Retour au dashboard
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
