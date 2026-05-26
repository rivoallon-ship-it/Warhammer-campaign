import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/(auth)/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui";
import { ensureProfile, getProfile } from "@/lib/profiles/profile-service";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile, error: profileError } = await getProfile(supabase, user.id);
  const activeProfile = profile ?? (await ensureProfile(supabase, user));
  const displayName = activeProfile?.display_name ?? user.email ?? "Joueur";
  const createdAt = activeProfile?.created_at
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(activeProfile.created_at))
    : null;

  return (
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-8 text-[#211a16]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col justify-between gap-4 border-b border-[#d8cbb7] pb-6 sm:flex-row sm:items-center">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="grid size-10 place-items-center rounded-md border border-[#c8bca7] bg-[#211a16] text-sm text-[#fffaf0]">
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
          description="Tes campagnes apparaîtront ici quand les lots de création, invitation et lobby seront activés."
        />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="button" disabled>
            Créer une campagne
          </Button>
          <Button type="button" variant="secondary" disabled>
            Rejoindre avec un code
          </Button>
          <Badge variant="warning">Disponible au lot campagnes</Badge>
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
              {profileError ? (
                <p className="rounded-md border border-[#c76d62] bg-[#f4d9d4] p-3 text-sm text-[#7b2922]">
                  Profil recréé depuis ton compte Auth.
                </p>
              ) : null}
              <div>
                <p className="text-sm font-semibold text-[#302720]">Pseudo</p>
                <p className="mt-1 text-sm text-[#5d5148]">{displayName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#302720]">Email</p>
                <p className="mt-1 text-sm text-[#5d5148]">{user.email}</p>
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
                La création et l’invitation de campagnes arrivent dans les lots
                suivants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  "Campagnes actives",
                  "Campagnes en lobby",
                  "Campagnes archivées",
                ].map((title) => (
                  <div
                    key={title}
                    className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4"
                  >
                    <h2 className="text-sm font-semibold text-[#302720]">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm text-[#6a5e54]">
                      Aucune campagne pour le moment.
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </main>
  );
}
