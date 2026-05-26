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
  buttonVariants,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name
      : user.email;

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

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {["Campagnes actives", "Campagnes en lobby", "Campagnes archivées"].map(
            (title) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>Aucune campagne pour le moment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="neutral">Vide</Badge>
                </CardContent>
              </Card>
            ),
          )}
        </section>
      </div>
    </main>
  );
}
