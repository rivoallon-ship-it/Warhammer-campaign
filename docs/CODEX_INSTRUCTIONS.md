# CODEX_INSTRUCTIONS.md
## Instructions de développement pour Codex
### Projet : Les Couronnes Brisées

## 1. Rôle de Codex

Développer une application web appelée **Les Couronnes Brisées**, gestionnaire en ligne de campagne pour Warhammer Age of Sigmar.

L’application doit permettre : comptes, profils, campagnes 2 à 6 joueurs, cartes dynamiques, lobby, ordres secrets, révélation, conquêtes, batailles, résultats, Gloire et tours ouverts.

## 2. Documents de référence

Lire et respecter :

- `docs/PRODUCT_SPEC.md`
- `docs/DATA_MODEL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/CODEX_INSTRUCTIONS.md`
- `docs/JOURNAL_DEVELOPPEMENT.md`
- `docs/UI_WIREFRAMES.md`
- `docs/MAP_DESIGN.md`

Priorité : ce document, puis implementation plan, data model, product spec, wireframes, map design.

## 3. Stack technique obligatoire

Utiliser Next.js, React, TypeScript, Tailwind CSS et Supabase. Ne pas changer de stack sans demande explicite.

## 4. Architecture attendue

Respecter autant que possible :

```text
/app
/components
/lib
/types
/docs
/supabase
```

Sous-dossiers clés : `/lib/supabase`, `/lib/campaigns`, `/lib/maps`, `/lib/orders`, `/lib/resolution`.

## 5. Principes généraux

Avancer par lots. Après chaque lot, le code doit compiler, démarrer et rester testable. Ne pas construire toute l’application d’un coup.

Garder le MVP simple : pas de héros, XP, mercenaires, alliances, détachements, influence Dragon/Géant, chat, notifications, éditeur de carte, paiement ou admin global.

Utiliser TypeScript strict. Éviter `any` sauf exception justifiée.

Séparer la logique métier de l’interface. Les composants React affichent et appellent des services ; la logique va dans `/lib`.

## 6. Règles produit importantes

### Campagnes ouvertes

Pas de nombre maximum de tours. Afficher `Saison 1 — Tour X`. Ne jamais bloquer au tour 6.

### Nombre de joueurs modulable

Une campagne accepte entre 2 et 6 joueurs.

### Cartes dynamiques

Ne jamais coder une carte fixe 4x4. Utiliser `campaign.map_width` et `campaign.map_height`.

| Joueurs | Carte |
|---:|---|
| 2 | 3 x 3 |
| 3 | 4 x 3 |
| 4 | 4 x 4 |
| 5 | 5 x 4 |
| 6 | 6 x 4 |

### MAP_CONFIGS

```ts
export const MAP_CONFIGS = {
  2: { width: 3, height: 3, template: "auto_2p", capitalSlots: ["A1", "C3"] },
  3: { width: 4, height: 3, template: "auto_3p", capitalSlots: ["A1", "A4", "C2"] },
  4: { width: 4, height: 4, template: "auto_4p", capitalSlots: ["A1", "A4", "D1", "D4"] },
  5: { width: 5, height: 4, template: "auto_5p", capitalSlots: ["A1", "A5", "D1", "D5", "B3"], fortifiedCapitalSlots: ["B3"] },
  6: { width: 6, height: 4, template: "auto_6p", capitalSlots: ["A1", "A6", "D1", "D6", "B3", "C4"], fortifiedCapitalSlots: ["B3", "C4"] },
} as const;
```

### Adjacence

Orthogonale seulement :

```ts
Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1
```

### Ordres secrets

Avant révélation : propriétaire voit son ordre, autres voient seulement statut, maître ne voit pas les détails. Après révélation : tous les joueurs actifs voient tous les ordres.

### Actions MVP

Actions affichées : `Conquérir`, `Fortifier`.

Actions internes stockées dans `orders.action_type` : `conquer`, `fortify`.

`conquer` remplace les anciens ordres séparés `attack` et `explore`.

### Validation

- `conquer` : source contrôlée par joueur, cible adjacente, cible neutre ou ennemie, jamais un territoire déjà contrôlé par le joueur.
- `fortify` : cible contrôlée par joueur.

### Conquête neutre non contestée

D6 automatique à la révélation. 1-2 échec, 3-6 succès. +1 Gloire dans tous les cas. Succès = territoire au joueur.

### Conquête neutre contestée

Si deux joueurs ou plus visent le même territoire neutre, créer une bataille multi-joueurs. Un D6 automatique classe les participants pour l'avantage, mais le territoire revient seulement au vainqueur saisi après la bataille.

### Bataille

Conquête d'un territoire ennemi : bataille entre attaquant et défenseur. Attaquant gagne : territoire à attaquant, attaquant +3, défenseur +1. Défenseur gagne : territoire inchangé, défenseur +2, attaquant +1.

Bataille multi-joueurs : le vainqueur gagne le territoire et +3 Gloire, chaque autre participant gagne +1 Gloire.

Retirer la fortification après bataille si elle a fourni le bonus défensif.

### Points d’armée

```ts
export function getArmyBasePoints(turnNumber: number): number {
  if (turnNumber <= 2) return 750;
  if (turnNumber <= 4) return 1000;
  if (turnNumber <= 6) return 1250;
  return 1500;
}
```

## 7. Supabase

Tables attendues : `profiles`, `campaigns`, `campaign_players`, `territories`, `territory_adjacencies`, `campaign_turns`, `orders`, `battles`, `battle_participants`, `explorations`, `campaign_logs`.

Activer RLS sur toutes les tables applicatives. Ne pas exposer de service role key. Côté client, utiliser seulement `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Règles : utilisateur lit ses campagnes, joueur modifie ses infos de lobby, maître lance/révèle/résout/termine, joueur ne lit que ses ordres avant révélation, tous lisent après révélation.

## 8. UI / UX

Interface claire, lisible, fantasy léger, adaptée adultes/enfants, responsive. Actions critiques avec confirmation : lancer campagne, révéler ordres, saisir résultat, finir tour, retirer/refuser joueur.

Messages d’erreur compréhensibles : capitale prise, cible non adjacente, territoire non contrôlé, tous les joueurs doivent valider.

La carte doit afficher couleurs joueurs, neutres en gris, type, fortification, fiche au clic.

## 9. Qualité

Avant de terminer une tâche :

```bash
npm run lint
npm run build
```

Si impossible ou échec externe, expliquer clairement.

Chaque page avec données doit gérer loading, erreur, vide, succès.

## 10. Conventions

Tables Supabase en `snake_case`, TypeScript en `camelCase`, composants React en `PascalCase`.

## 11. Pages MVP attendues

- `/signup`
- `/login`
- `/dashboard`
- `/campaigns/new`
- `/campaigns/join`
- `/campaigns/[campaignId]`
- `/campaigns/[campaignId]/lobby`
- `/campaigns/[campaignId]/map` redirige vers `/campaigns/[campaignId]`
- `/campaigns/[campaignId]/orders` redirige vers `/campaigns/[campaignId]`
- `/campaigns/[campaignId]/reveal`
- `/campaigns/[campaignId]/results`

## 12. Tests manuels clés

Création compte, campagne 2 joueurs, code invitation, second joueur rejoint, maître accepte, joueurs prêts, lancement, carte 3x3, ordres secrets, révélation, conquête neutre automatique, bataille, Gloire, fin de tour.

## 13. Ce qu’il ne faut pas faire

Ne pas coder carte 4x4 fixe, supposer 4 joueurs, bloquer au tour 6, révéler trop tôt, exposer ordres secrets, tout mettre dans React, ignorer RLS, ajouter fonctionnalités hors MVP ou exposer secrets.

## 14. Définition de terminé

Une tâche est terminée si le code est implémenté, TypeScript corrigé, UI s’affiche, règles du lot respectées, états prévus, lint/build passent ou exceptions expliquées, périmètre non dépassé.
