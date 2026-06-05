import Link from "next/link";
import { Badge, Button, Card, CardContent, PageHeader, buttonVariants } from "@/components/ui";

const steps = [
  {
    title: "Crée une campagne",
    description: "Choisis un format de 2 à 6 joueurs et prépare le lobby.",
  },
  {
    title: "Invite tes joueurs",
    description: "Partage un code, valide les factions, couleurs et capitales.",
  },
  {
    title: "Donnez vos ordres",
    description: "Chaque joueur planifie son action en secret avant la révélation.",
  },
  {
    title: "Jouez les batailles",
    description: "Résolvez explorations, conquêtes, Gloire et tour suivant.",
  },
];

const mapTiles = [
  { code: "A1", label: "Capitale", tone: "bg-[#4b201b] border-[#b84b35]" },
  { code: "A2", label: "Ruines", tone: "bg-[#292b28] border-[#91826a]" },
  { code: "A3", label: "Dragon", tone: "bg-[#173a29] border-[#348a67]" },
  { code: "B1", label: "Village", tone: "bg-[#15314a] border-[#397896]" },
  { code: "B2", label: "Fort", tone: "bg-[#3a2b18] border-[#a77b24]" },
  { code: "B3", label: "Sauvage", tone: "bg-[#263a13] border-[#627d37]" },
  { code: "C1", label: "Tour", tone: "bg-[#28163b] border-[#6f5ca8]" },
  { code: "C2", label: "Géant", tone: "bg-[#3a2417] border-[#98613d]" },
  { code: "C3", label: "Capitale", tone: "bg-[#17335a] border-[#315d9f]" },
];

function CampaignMapBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#243027]"
    >
      <div className="absolute inset-0 bg-[#1d271f]/35" />
      <div className="absolute left-1/2 top-1/2 grid w-[760px] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-[-6deg] grid-cols-3 gap-3 opacity-80 sm:w-[880px]">
        {mapTiles.map((tile) => (
          <div
            key={tile.code}
            className={`h-32 rounded-md border-2 p-4 shadow-xl ${tile.tone}`}
          >
            <div className="flex items-center justify-between text-sm font-bold text-[#f4ce73]">
              <span>{tile.code}</span>
              <span>◆</span>
            </div>
            <div className="mt-8 text-base font-semibold text-[#f3ead7]">
              {tile.label}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[#11180f]/45" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="campaign-fantasy-shell min-h-screen text-[#f3ead7]">
      <section className="relative flex min-h-[88vh] items-center overflow-hidden px-6 py-8 text-[#fffaf0]">
        <CampaignMapBackdrop />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col">
          <header className="mb-20 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 font-semibold">
              <span className="grid size-10 place-items-center rounded-md border border-[#e9d7a5]/60 bg-[#211a16]/50 text-lg">
                HR
              </span>
              <span>HexRealm</span>
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outlineDark", size: "sm" })}
            >
              Connexion
            </Link>
          </header>

          <div className="max-w-3xl">
            <Badge variant="warning">Campagnes ouvertes 2 à 6 joueurs</Badge>
            <h1 className="mt-6 max-w-2xl text-5xl font-bold leading-[1.05] sm:text-6xl">
              HexRealm
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#f3e7cd] sm:text-xl">
              Gestionnaire de campagne Age of Sigmar pour créer une partie,
              inviter tes joueurs, donner des ordres secrets et conquérir une
              carte tour après tour.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                Créer un compte
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Se connecter
              </Link>
              <Link
                href="/campaigns/join"
                className={buttonVariants({ variant: "outlineDark", size: "lg" })}
              >
                Rejoindre une campagne
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="campaign-fantasy-content px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            eyebrow="Comment ça marche ?"
            title="Un tour de campagne lisible, du lobby à la Gloire."
            description="Le MVP garde la couche campagne simple : cartes dynamiques, ordres secrets, batailles, explorations et passage au tour suivant sans limite automatique."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Card key={step.title}>
                <CardContent>
                  <div className="mb-5 grid size-10 place-items-center rounded-md border border-[#d5a653]/70 bg-[#3a2b18] text-sm font-bold text-[#f4ce73]">
                    {index + 1}
                  </div>
                  <h2 className="text-xl font-semibold">{step.title}</h2>
                  <p className="fantasy-muted mt-3 text-sm leading-6">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="ghost">
              Saison 1 — Tour X
            </Button>
            <Badge variant="neutral">Carte hex 5x4 à 9x6 selon les joueurs</Badge>
            <Badge variant="success">Ordres révélés simultanément</Badge>
          </div>
        </div>
      </section>
    </main>
  );
}
