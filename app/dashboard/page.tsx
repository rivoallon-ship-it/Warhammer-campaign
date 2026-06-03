import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/(auth)/actions";
import { updateProfileAction } from "@/app/dashboard/actions";
import { DashboardCampaignSection } from "@/components/campaign/dashboard-campaign-section";
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
  buttonVariants,
} from "@/components/ui";
import {
  getDashboardCampaigns,
  groupDashboardCampaigns,
} from "@/lib/campaigns/dashboard-service";
import { ensureProfile, getProfile } from "@/lib/profiles/profile-service";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams?: Promise<{
    profileError?: string;
    profileSuccess?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile, error: profileError } = await getProfile(supabase, user.id);
  const activeProfile = profile ?? (await ensureProfile(supabase, user));
  const { campaigns, error: campaignsError } = await getDashboardCampaigns(
    supabase,
    user.id,
  );
  const groupedCampaigns = groupDashboardCampaigns(campaigns);
  const displayName = activeProfile?.display_name ?? user.email ?? "Joueur";
  const favoriteColor = activeProfile?.favorite_color ?? "";
  const avatar = activeProfile?.avatar ?? "";
  const createdAt = activeProfile?.created_at
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(activeProfile.created_at))
    : null;

  return (
    <main className="campaign-fantasy-shell min-h-screen px-6 py-8 text-[#f3ead7]">
      <div className="campaign-fantasy-content mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col justify-between gap-4 border-b border-[#c89a53]/45 pb-6 sm:flex-row sm:items-center">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="grid size-10 place-items-center rounded-md border border-[#d5a653]/70 bg-[#211a16] text-sm text-[#f4ce73]">
              LC
            </span>
            <span>Les Couronnes Brisées</span>
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Se déconnecter
            </Button>
          </form>
        </header>

        <PageHeader
          eyebrow="Dashboard"
          title={`Bonjour, ${displayName}`}
          description="Retrouve tes campagnes, ton rôle, ton statut de lobby et ton profil joueur."
        />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/campaigns/new" className={buttonVariants()}>
            Créer une campagne
          </Link>
          <Link
            href="/campaigns/join"
            className={buttonVariants({ variant: "secondary" })}
          >
            Rejoindre avec un code
          </Link>
        </div>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Profil utilisateur</CardTitle>
              <CardDescription>
                Ces informations viennent de Supabase Auth et de la table
                profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileError || params?.profileError ? (
                <p className="fantasy-alert fantasy-alert-danger p-3 text-sm">
                  {params?.profileError ?? "Profil recréé depuis ton compte Auth."}
                </p>
              ) : null}
              {params?.profileSuccess ? (
                <p className="fantasy-alert fantasy-alert-success p-3 text-sm">
                  {params.profileSuccess}
                </p>
              ) : null}
              <form action={updateProfileAction} className="space-y-4">
                <Input
                  label="Pseudo"
                  name="displayName"
                  required
                  defaultValue={displayName}
                />
                <Input
                  label="Couleur favorite"
                  name="favoriteColor"
                  placeholder="Rouge, bleu, vert..."
                  defaultValue={favoriteColor}
                />
                <Input
                  label="Avatar ou icône"
                  name="avatar"
                  placeholder="Ex. couronne, marteau, étoile..."
                  defaultValue={avatar}
                />
                <Button type="submit" variant="outline" className="w-full">
                  Modifier mon profil
                </Button>
              </form>
              <div>
                <p className="text-sm font-semibold text-[#f3ead7]">Email</p>
                <p className="fantasy-muted mt-1 text-sm">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={user.email_confirmed_at ? "success" : "warning"}>
                  {user.email_confirmed_at ? "Email confirmé" : "Email à confirmer"}
                </Badge>
                {createdAt ? <Badge variant="neutral">Profil créé le {createdAt}</Badge> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>État des campagnes</CardTitle>
              <CardDescription>
                Vue synthétique de tes campagnes par statut.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsError ? (
                <p className="fantasy-alert fantasy-alert-danger p-3 text-sm">
                  Impossible de charger tes campagnes pour le moment.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="fantasy-stat p-4">
                    <p className="text-2xl font-bold">{groupedCampaigns.active.length}</p>
                    <p className="fantasy-muted mt-1 text-sm">Actives</p>
                  </div>
                  <div className="fantasy-stat p-4">
                    <p className="text-2xl font-bold">{groupedCampaigns.lobby.length}</p>
                    <p className="fantasy-muted mt-1 text-sm">En lobby</p>
                  </div>
                  <div className="fantasy-stat p-4">
                    <p className="text-2xl font-bold">
                      {groupedCampaigns.archived.length}
                    </p>
                    <p className="fantasy-muted mt-1 text-sm">Archivées</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <div className="mt-12 space-y-10">
          <DashboardCampaignSection
            title="Campagnes actives"
            campaigns={groupedCampaigns.active}
            emptyText="Aucune campagne active pour le moment."
          />
          <DashboardCampaignSection
            title="Campagnes en lobby"
            campaigns={groupedCampaigns.lobby}
            emptyText="Aucune campagne en préparation."
          />
          <DashboardCampaignSection
            title="Campagnes terminées ou archivées"
            campaigns={groupedCampaigns.archived}
            emptyText="Aucune campagne terminée ou archivée."
          />
        </div>
      </div>
    </main>
  );
}
