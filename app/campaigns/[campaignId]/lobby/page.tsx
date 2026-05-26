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

type LobbyPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function LobbyPage({ params }: LobbyPageProps) {
  const { campaignId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/lobby`);
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  const { data: players } = await supabase
    .from("campaign_players")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  const activePlayers =
    players?.filter((player) => player.status === "active") ?? [];
  const pendingPlayers =
    players?.filter((player) => player.status === "pending") ?? [];

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Lobby"
          title={campaign.name}
          description="Le lobby complet arrive au Lot 8. Pour l’instant, cette page confirme la création et affiche les informations utiles."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card>
            <CardHeader>
              <Badge variant="lobby" className="mb-4 w-fit">
                Code invitation
              </Badge>
              <CardTitle className="text-3xl">{campaign.invite_code}</CardTitle>
              <CardDescription>
                Les joueurs utiliseront ce code pour demander à rejoindre la
                campagne.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[#5d5148]">
              <p>
                Joueurs : {activePlayers.length} / {campaign.player_count}
              </p>
              <p>
                Carte : {campaign.map_width} x {campaign.map_height}
              </p>
              <p>Template : {campaign.map_template}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Joueurs</CardTitle>
              <CardDescription>
                Les validations, réglages, couleurs et capitales seront ajoutés
                dans les prochains lots.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activePlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex flex-col justify-between gap-3 rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-[#302720]">
                      {player.display_name}
                    </p>
                    <p className="mt-1 text-sm text-[#6a5e54]">
                      {player.role === "game_master" ? "Maître de campagne" : "Joueur"}
                    </p>
                  </div>
                  <Badge variant={player.is_ready ? "success" : "neutral"}>
                    {player.is_ready ? "Prêt" : "Pas prêt"}
                  </Badge>
                </div>
              ))}
              {pendingPlayers.length ? (
                <div className="rounded-md border border-[#7395bd] bg-[#ddeafa] p-4 text-sm text-[#284d77]">
                  {pendingPlayers.length} demande
                  {pendingPlayers.length > 1 ? "s" : ""} en attente.
                </div>
              ) : null}
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline" })}
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
