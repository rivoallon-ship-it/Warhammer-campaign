import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { DashboardCampaignCard } from "@/components/campaign/dashboard-campaign-card";
import type { DashboardCampaign } from "@/lib/campaigns/dashboard-service";

type DashboardCampaignSectionProps = {
  campaigns: DashboardCampaign[];
  emptyText: string;
  title: string;
};

export function DashboardCampaignSection({
  campaigns,
  emptyText,
  title,
}: DashboardCampaignSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="fantasy-panel-title text-xl font-semibold">{title}</h2>
        <p className="fantasy-muted mt-1 text-sm">
          {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""}
        </p>
      </div>
      {campaigns.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <DashboardCampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Aucune campagne</CardTitle>
            <CardDescription>{emptyText}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="fantasy-muted text-sm">
              Cette section se remplira automatiquement quand tu auras créé ou
              rejoint une campagne.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
