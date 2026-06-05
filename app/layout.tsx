import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HexRealm",
  description:
    "Gestionnaire de campagne narrative pour Warhammer Age of Sigmar.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
