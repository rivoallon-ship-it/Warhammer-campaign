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
  label: `${playerCount} joueurs - carte hex ${config.width} x ${config.height} (${config.width * config.height} territoires)`,
  value: playerCount,
}));

function MapPreview({ playerCount }: { playerCount: PlayerCount }) {
  const config = MAP_CONFIGS[playerCount];

  return (
    <div className="fantasy-stat p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#f3ead7]">
            Carte hexagonale {config.width} x {config.height}
          </p>
          <p className="fantasy-muted mt-1 text-sm">
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
    <main className="campaign-fantasy-shell min-h-screen px-6 py-10 text-[#f3ead7]">
      <div className="campaign-fantasy-content mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Campagne"
          title="Créer une campagne"
          description="Choisis le format de campagne. Les nouvelles cartes utilisent des territoires hexagonaux plus vastes."
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
              <p className="fantasy-alert fantasy-alert-danger p-3 text-sm">
                {params.error}
              </p>
            ) : null}
            <form action={createCampaignAction} className="space-y-5">
              <Input
                label="Nom de campagne"
                name="name"
                placeholder="Ex. La Marche d'HexRealm"
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
