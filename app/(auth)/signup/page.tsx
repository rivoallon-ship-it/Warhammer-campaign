import Link from "next/link";
import { signUpAction } from "@/app/(auth)/actions";
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

type SignupPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="campaign-fantasy-shell min-h-screen px-6 py-12 text-[#f3ead7]">
      <div className="campaign-fantasy-content mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 font-semibold">
          <span className="grid size-10 place-items-center rounded-md border border-[#d5a653]/70 bg-[#211a16] text-sm text-[#f4ce73]">
            HR
          </span>
          <span>HexRealm</span>
        </Link>

        <Card>
          <CardHeader>
            <Badge variant="lobby" className="mb-4 w-fit">
              Nouveau joueur
            </Badge>
            <CardTitle>Créer un compte</CardTitle>
            <CardDescription>
              Prépare ton profil avant de rejoindre ou créer une campagne.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {params?.error ? (
              <p className="fantasy-alert fantasy-alert-danger mb-5 p-3 text-sm">
                {params.error}
              </p>
            ) : null}

            <form action={signUpAction} className="space-y-4">
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
                autoComplete="new-password"
                minLength={6}
                required
              />
              <Input
                label="Pseudo"
                name="displayName"
                type="text"
                autoComplete="nickname"
                required
              />
              <Button type="submit" className="w-full">
                Créer mon compte
              </Button>
            </form>

            <p className="fantasy-muted mt-6 text-sm">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-semibold text-[#f4ce73]">
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
