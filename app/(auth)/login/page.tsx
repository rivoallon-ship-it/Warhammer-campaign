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
    <main className="min-h-screen bg-[#f7f0e2] px-6 py-12 text-[#211a16]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 font-semibold">
          <span className="grid size-10 place-items-center rounded-md border border-[#c8bca7] bg-[#211a16] text-sm text-[#fffaf0]">
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
              <p className="mb-5 rounded-md border border-[#c76d62] bg-[#f4d9d4] p-3 text-sm text-[#7b2922]">
                {params.error}
              </p>
            ) : null}
            {params?.success ? (
              <p className="mb-5 rounded-md border border-[#6fa07e] bg-[#e1f0e4] p-3 text-sm text-[#23543b]">
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

            <p className="mt-6 text-sm text-[#5d5148]">
              Pas encore de compte ?{" "}
              <Link href="/signup" className="font-semibold text-[#8a3f2d]">
                Créer un compte
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
