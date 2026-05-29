import { redirect } from "next/navigation";

type OrdersPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

export default async function OrdersPage({
  params,
  searchParams,
}: OrdersPageProps) {
  const { campaignId } = await params;
  const query = await searchParams;
  const paramsToForward = new URLSearchParams();

  if (query?.submitted) {
    paramsToForward.set("submitted", query.submitted);
  }

  if (query?.error) {
    paramsToForward.set("error", query.error);
  }

  const suffix = paramsToForward.toString()
    ? `?${paramsToForward.toString()}`
    : "";

  redirect(`/campaigns/${campaignId}${suffix}`);
}
