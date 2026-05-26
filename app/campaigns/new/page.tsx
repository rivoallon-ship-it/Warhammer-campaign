import Link from "next/link";
import { redirect } from "next/navigation";
import { createCampaignAction } from "@/app/campaigns/new/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Select,
  buttonVariants,
} from "@/components/ui";
import { MAP_CONFIGS, type PlayerCount } from "@/lib/maps/map-configs";
import { createClient } from "@/lib/supabase/server";

type NewCampaignPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const playerOptions = Object.entries(MAP_CONFIGS).map(([playerCount, config]) => ({
  label: `${playerCount} joueurs — ${config.width} x ${config.height} (${config.width * config.height} territoires)`,
  value: playerCount,
}));

function MapPreview({ playerCount }: { playerCount: PlayerCount }) {
  const config = MAP_CONFIGS[playerCount];

  return (
    <div className="rounded-md border border-[#d8cbb7] bg-[#fffdf8] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#302720]">
            Carte {config.width} x {config.height}
          </p>
          <p className="mt-1 text-sm text-[#6a5e54]">
            {config.width * config.height} territoires, capitales proposées :{" "}
            {config.capitalSlots.join(", ")}
          </p>
        </div>
        <Badge variant="neutral">{config.template}</Badge>
      </div>
    </div>
  );
}

export default async function NewCampaignPage({
  searchParams,
}: NewCampaignPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/campaigns/new");
  }

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Campagne"
          title="Créer une campagne"
          description="Choisis le format de campagne. La carte sera dimensionnée automatiquement selon le nombre de joueurs."
        />
        <Card className="mt-8">
          <CardHeader>
            <Badge variant="lobby" className="mb-4 w-fit">
              Campagne ouverte
            </Badge>
            <CardTitle>Paramètres de départ</CardTitle>
            <CardDescription>
              Les campagnes n’ont pas de fin automatique. L’affichage restera
              au format Saison 1 — Tour X.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {params?.error ? (
              <p className="rounded-md border border-[#c76d62] bg-[#f4d9d4] p-3 text-sm text-[#7b2922]">
                {params.error}
              </p>
            ) : null}
            <form action={createCampaignAction} className="space-y-5">
              <Input
                label="Nom de campagne"
                name="name"
                placeholder="Ex. Les Couronnes Brisées"
                required
              />
              <Select
                label="Nombre de joueurs"
                name="playerCount"
                defaultValue="2"
                options={playerOptions}
                required
              />
              <div className="grid gap-3">
                {([2, 3, 4, 5, 6] as const).map((playerCount) => (
                  <MapPreview key={playerCount} playerCount={playerCount} />
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit">Créer la campagne</Button>
                <Link
                  href="/dashboard"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Annuler
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
