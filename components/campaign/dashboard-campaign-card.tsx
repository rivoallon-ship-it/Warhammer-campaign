import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle, buttonVariants } from "@/components/ui";
import type { DashboardCampaign } from "@/lib/campaigns/dashboard-service";
import type { CampaignPhase, CampaignStatus } from "@/types/campaign";

const statusLabels: Record<CampaignStatus, string> = {
  lobby: "Lobby",
  active: "Active",
  season_end: "Fin de saison",
  finished: "Terminée",
  archived: "Archivée",
};

const phaseLabels: Record<CampaignPhase, string> = {
  lobby: "Lobby",
  orders: "Ordres",
  revealed: "Révélée",
  resolving: "Résolution",
  end_turn: "Fin de tour",
  season_summary: "Bilan",
  finished: "Terminée",
};

function getStatusVariant(status: CampaignStatus) {
  if (status === "active") return "active";
  if (status === "lobby") return "lobby";
  if (status === "archived" || status === "finished") return "neutral";
  return "warning";
}

function getTurnLabel(campaign: DashboardCampaign) {
  if (campaign.status === "lobby") return "En préparation";
  return `Saison ${campaign.seasonNumber} — Tour ${campaign.turnNumber}`;
}

type DashboardCampaignCardProps = {
  campaign: DashboardCampaign;
};

export function DashboardCampaignCard({ campaign }: DashboardCampaignCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant={getStatusVariant(campaign.status)}>
            {statusLabels[campaign.status]}
          </Badge>
          <Badge variant={campaign.role === "game_master" ? "warning" : "neutral"}>
            {campaign.role === "game_master" ? "Maître" : "Joueur"}
          </Badge>
          {campaign.playerStatus === "pending" ? (
            <Badge variant="info">En attente</Badge>
          ) : null}
        </div>
        <CardTitle>{campaign.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="font-semibold text-[#302720]">Tour</dt>
            <dd className="mt-1 text-[#5d5148]">{getTurnLabel(campaign)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#302720]">Phase</dt>
            <dd className="mt-1 text-[#5d5148]">{phaseLabels[campaign.phase]}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#302720]">Carte</dt>
            <dd className="mt-1 text-[#5d5148]">
              {campaign.mapWidth} x {campaign.mapHeight}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#302720]">Gloire</dt>
            <dd className="mt-1 text-[#5d5148]">{campaign.glory}</dd>
          </div>
        </dl>
        <Link
          href={`/campaigns/${campaign.id}`}
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          Ouvrir
        </Link>
      </CardContent>
    </Card>
  );
}
