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

export default function NewCampaignPage() {
  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Campagne"
          title="Créer une campagne"
          description="La création complète arrive au Lot 6. Cette page évite les routes vides pendant la mise en place du dashboard."
        />
        <Card className="mt-8">
          <CardHeader>
            <Badge variant="warning" className="mb-4 w-fit">
              Lot 6
            </Badge>
            <CardTitle>Création bientôt activée</CardTitle>
            <CardDescription>
              La prochaine étape ajoutera le nom de campagne, le nombre de
              joueurs et la configuration de carte.
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
