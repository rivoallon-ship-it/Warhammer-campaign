import Link from "next/link";
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

type CampaignPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { campaignId } = await params;

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Campagne"
          title="Dashboard de campagne"
          description="Le dashboard détaillé de campagne arrive après le lobby et la génération de carte."
        />
        <Card className="mt-8">
          <CardHeader>
            <Badge variant="info" className="mb-4 w-fit">
              Préparation
            </Badge>
            <CardTitle>Campagne {campaignId}</CardTitle>
            <CardDescription>
              Cette route est prête pour les prochains lots : lobby, carte,
              ordres et résolution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              Retour au dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
