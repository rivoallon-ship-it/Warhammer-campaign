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
        <h2 className="text-xl font-semibold text-[#211a16]">{title}</h2>
        <p className="mt-1 text-sm text-[#6a5e54]">
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
            <p className="text-sm text-[#6a5e54]">
              Cette section se remplira automatiquement quand tu auras créé ou
              rejoint une campagne.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
