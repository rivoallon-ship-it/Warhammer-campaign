import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { createClient } from "@/lib/supabase/server";

type CampaignPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    launched?: string;
  }>;
};

function getStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "lobby") return "Lobby";
  if (status === "archived") return "Archivée";
  if (status === "finished") return "Terminée";

  return status;
}

function getPhaseLabel(phase: string) {
  if (phase === "orders") return "Ordres";
  if (phase === "lobby") return "Lobby";
  if (phase === "revealed") return "Révélation";
  if (phase === "resolving") return "Résolution";
  if (phase === "end_turn") return "Fin de tour";

  return phase;
}

export default async function CampaignPage({
  params,
  searchParams,
}: CampaignPageProps) {
  const { campaignId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}`);
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  const { data: currentTurn } = await supabase
    .from("campaign_turns")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("turn_number", campaign.current_turn_number || 1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Campagne"
          title={campaign.name}
          description="La campagne est prête pour les prochaines étapes : carte interactive, ordres et résolution."
        />

        {query?.launched ? (
          <p className="mt-6 rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b]">
            Campagne lancée. La carte a été générée et le tour 1 est ouvert.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant={campaign.status === "active" ? "active" : "lobby"}>
                  {getStatusLabel(campaign.status)}
                </Badge>
                <Badge variant="neutral">{getPhaseLabel(campaign.current_phase)}</Badge>
              </div>
              <CardTitle>
                Saison {campaign.season_number} — Tour{" "}
                {campaign.current_turn_number || 1}
              </CardTitle>
              <CardDescription>
                Les ordres secrets seront ajoutés après la page carte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                  <dt className="font-semibold text-[#302720]">Armées</dt>
                  <dd className="mt-1 text-[#5d5148]">
                    {currentTurn?.army_base_points ?? 750} pts
                  </dd>
                </div>
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                  <dt className="font-semibold text-[#302720]">Carte</dt>
                  <dd className="mt-1 text-[#5d5148]">
                    {campaign.map_width} x {campaign.map_height}
                  </dd>
                </div>
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
                  <dt className="font-semibold text-[#302720]">Joueurs</dt>
                  <dd className="mt-1 text-[#5d5148]">
                    {campaign.player_count}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Les prochains lots ajouteront la carte puis les ordres.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.status === "lobby" ? (
                <Link
                  href={`/campaigns/${campaign.id}/lobby`}
                  className={buttonVariants({ className: "w-full" })}
                >
                  Ouvrir le lobby
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                Retour au dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
