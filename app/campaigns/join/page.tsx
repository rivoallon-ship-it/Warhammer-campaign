import Link from "next/link";
import { redirect } from "next/navigation";
import { joinCampaignAction } from "@/app/campaigns/join/actions";
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
import {
  getColorLabel,
  getDisplayNameFromUser,
  getJoinCampaignDetails,
} from "@/lib/campaigns/join-campaign";
import { ensureProfile } from "@/lib/profiles/profile-service";
import { createClient } from "@/lib/supabase/server";

type JoinCampaignPageProps = {
  searchParams?: Promise<{
    code?: string;
    error?: string;
    joined?: string;
  }>;
};

function formatPlayerStatus(status: string) {
  if (status === "active") return "Validé";
  if (status === "pending") return "En attente";
  return status;
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-3 rounded-sm border border-[#c8bca7]"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export default async function JoinCampaignPage({
  searchParams,
}: JoinCampaignPageProps) {
  const params = await searchParams;
  const inviteCode = params?.code?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/campaigns/join");
  }

  const profile = await ensureProfile(supabase, user);
  const defaultDisplayName =
    profile?.display_name ?? getDisplayNameFromUser(user);
  const details = inviteCode
    ? await getJoinCampaignDetails(supabase, inviteCode, user.id)
    : null;
  const campaign = details?.campaign ?? null;
  const pageError = params?.error ?? details?.error ?? null;
  const canRequest =
    Boolean(details?.campaign) &&
    !details?.error &&
    !details?.currentPlayer &&
    Boolean(details?.availableColors.length) &&
    Boolean(details?.availableCapitals.length);

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-10 text-[#211a16]">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Invitation"
          title="Rejoindre une campagne"
          description="Saisis le code fourni par le maître de campagne, puis choisis ton identité de lobby."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
          <Card>
            <CardHeader>
              <Badge variant="info" className="mb-4 w-fit">
                Code invitation
              </Badge>
              <CardTitle>Recherche</CardTitle>
              <CardDescription>
                Le code est généré lors de la création de campagne.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {params?.joined ? (
                <p className="rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b]">
                  Demande envoyée. Le maître de campagne doit maintenant la
                  valider.
                </p>
              ) : null}
              {pageError ? (
                <p className="rounded-md border border-[#c76d62] bg-[#f4d9d4] p-3 text-sm text-[#7b2922]">
                  {pageError}
                </p>
              ) : null}
              <form action="/campaigns/join" className="space-y-4" method="get">
                <Input
                  label="Code invitation"
                  name="code"
                  defaultValue={details?.inviteCode ?? inviteCode}
                  placeholder="ABC123"
                  required
                  minLength={6}
                  maxLength={12}
                  className="uppercase"
                />
                <Button type="submit" className="w-full">
                  Chercher la campagne
                </Button>
              </form>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                Retour au dashboard
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Badge variant={campaign ? "lobby" : "neutral"} className="mb-4 w-fit">
                {campaign ? "Campagne trouvée" : "En attente du code"}
              </Badge>
              <CardTitle>{campaign?.name ?? "Aucune campagne sélectionnée"}</CardTitle>
              <CardDescription>
                {campaign
                  ? `${details?.reservedPlayerCount ?? 0} demande(s) ou joueur(s) sur ${campaign.player_count}.`
                  : "La campagne apparaîtra ici après recherche."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {campaign && details ? (
                <>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3">
                      <dt className="font-semibold text-[#302720]">Places</dt>
                      <dd className="mt-1 text-[#5d5148]">
                        {details.availableSeatCount} libre
                        {details.availableSeatCount > 1 ? "s" : ""}
                      </dd>
                    </div>
                    <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3">
                      <dt className="font-semibold text-[#302720]">Carte</dt>
                      <dd className="mt-1 text-[#5d5148]">
                        {campaign.map_width} x {campaign.map_height}
                      </dd>
                    </div>
                    <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3">
                      <dt className="font-semibold text-[#302720]">Validés</dt>
                      <dd className="mt-1 text-[#5d5148]">
                        {details.activePlayerCount} / {campaign.player_count}
                      </dd>
                    </div>
                  </dl>

                  {details.players.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[#302720]">
                        Joueurs et demandes
                      </p>
                      <div className="space-y-2">
                        {details.players.map((player) => (
                          <div
                            key={player.id}
                            className="flex flex-col gap-2 rounded-md border border-[#eadfce] bg-[#fffdf8] p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold text-[#302720]">
                                {player.display_name}
                              </p>
                              <p className="mt-1 text-sm text-[#6a5e54]">
                                {player.aos_faction ?? "Faction à renseigner"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {player.color ? (
                                <Badge variant="neutral" className="gap-2">
                                  <ColorSwatch color={player.color} />
                                  {getColorLabel(player.color)}
                                </Badge>
                              ) : null}
                              {player.starting_capital_code ? (
                                <Badge variant="neutral">
                                  {player.starting_capital_code}
                                </Badge>
                              ) : null}
                              <Badge
                                variant={
                                  player.status === "active" ? "success" : "info"
                                }
                              >
                                {formatPlayerStatus(player.status)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {details.currentPlayer ? (
                    <div className="rounded-md border border-[#7395bd] bg-[#ddeafa] p-4 text-sm text-[#284d77]">
                      Tu as déjà rejoint cette campagne. Ton statut actuel est :{" "}
                      {formatPlayerStatus(details.currentPlayer.status)}.
                    </div>
                  ) : null}

                  {canRequest ? (
                    <form action={joinCampaignAction} className="space-y-4">
                      <input
                        type="hidden"
                        name="inviteCode"
                        value={details.inviteCode}
                      />
                      <Input
                        label="Pseudo dans la campagne"
                        name="displayName"
                        required
                        defaultValue={defaultDisplayName}
                      />
                      <Input
                        label="Faction AoS"
                        name="aosFaction"
                        required
                        placeholder="Ex. Stormcast Eternals, Orruk Warclans..."
                      />
                      <Select
                        label="Couleur"
                        name="color"
                        required
                        options={details.availableColors.map((option) => ({
                          label: option.label,
                          value: option.value,
                        }))}
                      />
                      <Select
                        label="Capitale souhaitée"
                        name="startingCapitalCode"
                        required
                        options={details.availableCapitals.map((capital) => ({
                          label: capital,
                          value: capital,
                        }))}
                      />

                      {details.unavailableColors.length ||
                      details.unavailableCapitals.length ? (
                        <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3 text-sm text-[#5d5148]">
                          {details.unavailableColors.length ? (
                            <p>
                              Couleurs déjà prises :{" "}
                              {details.unavailableColors
                                .map((option) => option.label)
                                .join(", ")}
                            </p>
                          ) : null}
                          {details.unavailableCapitals.length ? (
                            <p>
                              Capitales déjà prises :{" "}
                              {details.unavailableCapitals.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <Button type="submit" className="w-full">
                        Demander à rejoindre
                      </Button>
                    </form>
                  ) : details.currentPlayer ? (
                    <Link
                      href={`/campaigns/${campaign.id}/lobby`}
                      className={buttonVariants({ className: "w-full" })}
                    >
                      Ouvrir le lobby
                    </Link>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[#5d5148]">
                  Entre un code invitation pour afficher les places disponibles.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
