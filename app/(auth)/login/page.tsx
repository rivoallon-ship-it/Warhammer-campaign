import Link from "next/link";
import { loginAction } from "@/app/(auth)/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="campaign-fantasy-shell min-h-screen px-6 py-12 text-[#f3ead7]">
      <div className="campaign-fantasy-content mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 font-semibold">
          <span className="grid size-10 place-items-center rounded-md border border-[#d5a653]/70 bg-[#211a16] text-sm text-[#f4ce73]">
            LC
          </span>
          <span>Les Couronnes Brisées</span>
        </Link>

        <Card>
          <CardHeader>
            <Badge variant="info" className="mb-4 w-fit">
              Connexion
            </Badge>
            <CardTitle>Se connecter</CardTitle>
            <CardDescription>
              Accède à ton tableau de bord de campagnes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {params?.error ? (
              <p className="fantasy-alert fantasy-alert-danger mb-5 p-3 text-sm">
                {params.error}
              </p>
            ) : null}
            {params?.success ? (
              <p className="fantasy-alert fantasy-alert-success mb-5 p-3 text-sm">
                {params.success}
              </p>
            ) : null}

            <form action={loginAction} className="space-y-4">
              <input type="hidden" name="next" value={params?.next ?? "/dashboard"} />
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
              <Input
                label="Mot de passe"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
              <Button type="submit" className="w-full">
                Se connecter
              </Button>
            </form>

            <p className="fantasy-muted mt-6 text-sm">
              Pas encore de compte ?{" "}
              <Link href="/signup" className="font-semibold text-[#f4ce73]">
                Créer un compte
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
