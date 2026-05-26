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

export default function JoinCampaignPage() {
  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Invitation"
          title="Rejoindre une campagne"
          description="La saisie du code invitation arrive au Lot 7. Cette page prépare le parcours sans laisser de route vide."
        />
        <Card className="mt-8">
          <CardHeader>
            <Badge variant="warning" className="mb-4 w-fit">
              Lot 7
            </Badge>
            <CardTitle>Invitation bientôt activée</CardTitle>
            <CardDescription>
              Le formulaire vérifiera le code, les places disponibles, la
              faction, la couleur et la capitale choisie.
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
