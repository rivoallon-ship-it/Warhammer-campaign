# Les Couronnes Brisées

Application web de gestion de campagne narrative pour **Warhammer Age of Sigmar**.

Le projet permet à des joueurs de créer une campagne en ligne, rejoindre une partie avec un code d’invitation, visualiser une carte de territoires, donner des ordres secrets, révéler automatiquement les ordres dès que tous les joueurs ont validé, résoudre les conquêtes et batailles, puis continuer la campagne tour après tour.

## 1. Objectif du projet

**Les Couronnes Brisées** est un gestionnaire de campagne en ligne.

Il ne remplace pas les règles de Warhammer Age of Sigmar. Il gère uniquement la couche campagne : joueurs, cartes, territoires, ordres, conquêtes, batailles, Gloire et tours de campagne.

## 2. MVP

Le MVP doit permettre :

- création de compte ;
- connexion ;
- profil utilisateur ;
- création de campagne ;
- campagnes de **2 à 6 joueurs** ;
- carte générée automatiquement selon le nombre de joueurs ;
- invitation par code ;
- lobby ;
- choix de faction, couleur et capitale ;
- validation des joueurs par le maître de campagne ;
- lancement de campagne ;
- page de campagne centrale avec carte interactive ;
- ordres secrets directement depuis la carte ;
- annulation ou remplacement d'un ordre tant que la phase d'ordres est ouverte ;
- révélation automatique et simultanée des ordres dès que tous les joueurs actifs ont validé ;
- génération des batailles et conquêtes automatiques ;
- résolution automatique des conquêtes neutres non contestées ;
- saisie des résultats de bataille ;
- mise à jour automatique des territoires et de la Gloire ;
- passage au tour suivant ;
- campagne ouverte sans limite de tours.

## 3. Hors périmètre MVP

Ne pas développer en V1 : héros, XP, blessures, artefacts, mercenaires, Influence Dragon / Géant, alliances, trahisons, détachements, raids avancés, éditeur de carte, chat, notifications, paiement, application mobile native.

## 4. Stack technique

Frontend : Next.js, React, TypeScript, Tailwind CSS.

Backend : Supabase Auth, Supabase PostgreSQL, Supabase Row Level Security.

Hébergement prévu : Vercel pour le frontend, Supabase Cloud pour la base de données et l’authentification.

## 5. Documents de référence

Les documents de conception se trouvent dans `/docs` :

- `PRODUCT_SPEC.md`
- `DATA_MODEL.md`
- `IMPLEMENTATION_PLAN.md`
- `CODEX_INSTRUCTIONS.md`
- `JOURNAL_DEVELOPPEMENT.md`
- `UI_WIREFRAMES.md`
- `MAP_DESIGN.md`

Ordre de priorité en cas de conflit :

1. `CODEX_INSTRUCTIONS.md`
2. `IMPLEMENTATION_PLAN.md`
3. `DATA_MODEL.md`
4. `PRODUCT_SPEC.md`
5. `UI_WIREFRAMES.md`
6. `MAP_DESIGN.md`

## 6. Structure cible du projet

```text
/aos-campaign-app
  /app
    /(auth)
      /login
      /signup
    /dashboard
    /campaigns
      /new
      /join
      /[campaignId]
        /lobby
        /map        # redirige vers la page campagne
        /orders     # redirige vers la page campagne
        /reveal
        /results
  /components
    /auth
    /campaign
    /orders
    /ui
  /lib
    /supabase
    /campaigns
    /maps
    /orders
    /resolution
  /types
    database.ts
    campaign.ts
  /docs
    PRODUCT_SPEC.md
    DATA_MODEL.md
    IMPLEMENTATION_PLAN.md
    CODEX_INSTRUCTIONS.md
    JOURNAL_DEVELOPPEMENT.md
    UI_WIREFRAMES.md
    MAP_DESIGN.md
  /supabase
    schema.sql
```

## 7. Règles produit clés

### Campagnes ouvertes

Les campagnes n’ont pas de fin automatique. Ne jamais bloquer la campagne au tour 6. L’affichage recommandé est :

```text
Saison 1 — Tour X
```

### Joueurs modulables

Une campagne accepte entre **2 et 6 joueurs**.

### Cartes dynamiques

| Joueurs | Carte |
|---:|---|
| 2 | hex 5 x 4 |
| 3 | hex 6 x 5 |
| 4 | hex 7 x 5 |
| 5 | hex 8 x 6 |
| 6 | hex 9 x 6 |

Ne jamais coder en dur une carte 4 x 4.

L'écran de campagne utilise une direction graphique fantasy sombre : panneaux bordés or, carte hexagonale sombre, hexagones parchemin et badges de types colorés.

La génération de carte est idempotente : si une carte existe déjà, l'application vérifie les territoires et les adjacences attendues. Pour les templates `hex_v1_*`, cette vérification utilise l'adjacence hexagonale, pas l'ancien comptage orthogonal.

### Ordres secrets

Avant révélation, le joueur voit son propre ordre ; les autres joueurs voient seulement “validé” ou “en attente” ; le maître de campagne ne voit pas les détails des ordres adverses. Après révélation, tous les joueurs actifs voient tous les ordres.

La révélation ne demande pas de validation manuelle du maître de campagne : l'enregistrement du dernier ordre valide déclenche automatiquement la phase de résolution.

## 8. Configuration des cartes

La configuration des cartes doit être placée dans `/lib/maps/map-configs.ts`.

```ts
export const MAP_CONFIGS = {
  2: { width: 5, height: 4, template: "hex_v1_2p", capitalSlots: ["A1", "D5"] },
  3: { width: 6, height: 5, template: "hex_v1_3p", capitalSlots: ["A1", "A6", "E3"] },
  4: { width: 7, height: 5, template: "hex_v1_4p", capitalSlots: ["A1", "A7", "E1", "E7"] },
  5: { width: 8, height: 6, template: "hex_v1_5p", capitalSlots: ["A1", "A8", "F1", "F8", "C4"], fortifiedCapitalSlots: ["C4"] },
  6: { width: 9, height: 6, template: "hex_v1_6p", capitalSlots: ["A1", "A9", "F1", "F9", "C4", "D6"], fortifiedCapitalSlots: ["C4", "D6"] },
} as const;
```

## 9. Ordres MVP

Chaque joueur actif peut soumettre un ordre par tour.

Actions affichées dans l'interface :

- `Conquérir`
- `Fortifier`

Actions stockées en base :

- `conquer`
- `fortify`

`conquer` remplace les anciens ordres séparés `attack` et `explore`.

Règles :

- les ordres se donnent depuis `/campaigns/[campaignId]`, en cliquant sur la carte ;
- les routes `/campaigns/[campaignId]/map` et `/campaigns/[campaignId]/orders` redirigent vers la page campagne ;
- cliquer sur un territoire contrôlé affiche `Fortifier` et les cibles à portée ;
- cliquer sur une cible conquérable affiche directement l'action `Conquérir` ;
- un ordre soumis peut être annulé ou remplacé tant que la phase est `orders` et que les ordres n'ont pas été révélés ;
- conquérir un territoire ennemi crée une bataille ;
- conquérir seul un territoire neutre lance automatiquement un D6 ;
- si plusieurs joueurs visent le même territoire neutre, une bataille multi-joueurs est créée ;
- fortifier cible un territoire contrôlé par le joueur.

## 10. Progression des armées

```ts
export function getArmyBasePoints(turnNumber: number): number {
  return Math.min(400 + Math.max(turnNumber - 1, 0) * 200, 2000);
}
```

## 11. Développement avec Codex

Le développement doit se faire par lots. Ne jamais demander à Codex de créer toute l’application d’un coup.

Ordre recommandé : initialisation, Supabase, schéma SQL, auth, dashboard, création campagne, rejoindre campagne, lobby, génération carte, dashboard campagne, carte interactive, ordres secrets, révélation, résolution, fin de tour, historique, polish UX.

Le suivi réel du développement est documenté dans `docs/JOURNAL_DEVELOPPEMENT.md`.

## 12. Premier prompt Codex recommandé

```text
Tu vas développer l’application Les Couronnes Brisées.

Lis les fichiers :
- docs/PRODUCT_SPEC.md
- docs/DATA_MODEL.md
- docs/IMPLEMENTATION_PLAN.md
- docs/CODEX_INSTRUCTIONS.md
- docs/UI_WIREFRAMES.md
- docs/MAP_DESIGN.md

Respecte strictement CODEX_INSTRUCTIONS.md.

Commence uniquement par le Lot 1 de IMPLEMENTATION_PLAN.md :
créer le squelette Next.js TypeScript Tailwind, la structure de dossiers, une page d’accueil et les composants UI de base.

Ne configure pas encore Supabase.
Ne code pas encore l’authentification.
Ne code pas encore les campagnes.

À la fin, vérifie que l’application démarre, que le lint/build passe, et résume les fichiers créés.
```

## 13. Commandes prévues

```bash
npm install
npm run dev
npm run lint
npm run build
```

## 14. Variables d’environnement prévues

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Utiliser `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` pour les nouveaux projets Supabase.
`NEXT_PUBLIC_SUPABASE_ANON_KEY` reste accepté pour compatibilité avec les anciennes clés.

Ne jamais exposer de clé Supabase `service_role` ou `sb_secret_*` côté client.

## 15. Sécurité Supabase

Le code d'invitation est vérifié côté base de données, pas seulement côté application.

- `get_join_campaign_details(invite_code)` retourne les informations minimales d'un lobby uniquement si le code fourni est valide.
- `request_join_campaign(invite_code, ...)` est le chemin normal pour rejoindre une campagne : la fonction vérifie le code, l'état du lobby, la place disponible, la couleur et la capitale avant de créer le joueur en `pending`.
- Les policies RLS ne doivent pas permettre à un utilisateur connecté de lire tous les lobbys ou d'insérer directement un joueur `pending` sans passer par la fonction SQL.

Sur une base Supabase déjà installée avant ce correctif, copier et exécuter `supabase/06_SECURITE_INVITATIONS.sql`.

## 16. Définition du MVP terminé

Le MVP est terminé quand un utilisateur peut créer une campagne 2 à 6 joueurs, inviter les autres, lancer la campagne, générer la carte, soumettre des ordres secrets, déclencher automatiquement la révélation, résoudre les conquêtes et batailles, mettre à jour territoires/Gloire et passer au tour suivant indéfiniment.
