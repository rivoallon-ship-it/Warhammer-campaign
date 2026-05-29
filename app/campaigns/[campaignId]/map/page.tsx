import { redirect } from "next/navigation";

type CampaignMapPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function CampaignMapPage({ params }: CampaignMapPageProps) {
  const { campaignId } = await params;

  redirect(`/campaigns/${campaignId}`);
}
