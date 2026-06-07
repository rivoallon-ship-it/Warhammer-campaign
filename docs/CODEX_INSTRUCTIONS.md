# CODEX_INSTRUCTIONS.md
## Instructions de développement pour Codex
### Projet : HexRealm

## 1. Rôle de Codex

Développer une application web appelée **HexRealm**, gestionnaire en ligne de campagne pour Warhammer Age of Sigmar.

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
| 2 | hex 5 x 4 |
| 3 | hex 6 x 5 |
| 4 | hex 7 x 5 |
| 5 | hex 8 x 6 |
| 6 | hex 9 x 6 |

### MAP_CONFIGS

```ts
export const MAP_CONFIGS = {
  2: { width: 5, height: 4, template: "hex_v1_2p", capitalSlots: ["A1", "D5"] },
  3: { width: 6, height: 5, template: "hex_v1_3p", capitalSlots: ["A1", "A6", "E3"] },
  4: { width: 7, height: 5, template: "hex_v1_4p", capitalSlots: ["A1", "A7", "E1", "E7"] },
  5: { width: 8, height: 6, template: "hex_v1_5p", capitalSlots: ["A1", "A8", "F1", "F8", "C4"], fortifiedCapitalSlots: ["C4"] },
  6: { width: 9, height: 6, template: "hex_v1_6p", capitalSlots: ["A1", "A9", "F1", "F9", "C4", "D6"], fortifiedCapitalSlots: ["C4", "D6"] },
} as const;
```

### Adjacence

Les nouvelles campagnes utilisent une carte hexagonale `hex_v1_*`. Chaque territoire peut avoir jusqu'à six voisins. Les lignes paires sont décalées visuellement et dans le calcul d'adjacence.

### Ordres secrets

Avant révélation : propriétaire voit son ordre, autres voient seulement statut, maître ne voit pas les détails. Après révélation : tous les joueurs actifs voient tous les ordres. La révélation se déclenche automatiquement à la soumission du dernier ordre actif ; ne pas réintroduire de bouton de validation maître pour passer en résolution.

Si la révélation ne crée aucune bataille, le tour doit être terminé automatiquement : les conquêtes automatiques et fortifications sont appliquées, les ordres passent en `resolved`, le tour courant passe en `finished`, le tour suivant est créé en phase `orders`, et un message informe l'utilisateur.

### Actions MVP

Actions affichées : `Conquérir`, `Fortifier`.

Actions internes stockées dans `orders.action_type` : `conquer`, `fortify`.

`conquer` remplace les anciens ordres séparés `attack` et `explore`.

### Validation

- `conquer` : source contrôlée par joueur, cible adjacente, cible neutre ou ennemie, jamais un territoire déjà contrôlé par le joueur.
- `fortify` : cible contrôlée par joueur, non fortifiée et qui n'est pas une forteresse.

### Conquête neutre non contestée

D6 automatique à la révélation. La difficulté dépend du soutien adjacent : 1 territoire contrôlé adjacent à la cible = réussite sur 3+, 2 territoires contrôlés adjacents = réussite sur 2+, 3 territoires contrôlés adjacents ou plus = conquête automatique. Dragon et Géant sont plus difficiles : avec 1 soutien, réussite sur 4+ ; avec 2 soutiens, réussite sur 2+ ; avec 3 soutiens ou plus, conquête automatique. +1 Gloire dans tous les cas. Succès = territoire au joueur. Dragon et Géant donnent +3 Gloire supplémentaire si la conquête réussit.

### Conquête neutre contestée

Si deux joueurs ou plus visent le même territoire neutre, créer une bataille multi-joueurs. Un D6 automatique classe les participants pour l'avantage, mais le territoire revient seulement au vainqueur saisi après la bataille.

### Bataille

Conquête d'un territoire ennemi : bataille entre attaquant et défenseur. Attaquant gagne : territoire à attaquant, attaquant +3, défenseur +1. Défenseur gagne : territoire inchangé, défenseur +2, attaquant +1.

Bataille multi-joueurs : le vainqueur gagne le territoire et +3 Gloire, chaque autre participant gagne +1 Gloire.

Bonus de territoire : capitale capturée par attaquant = +5 Gloire supplémentaire ; première conquête d'une ruine = +1 Gloire supplémentaire ; Dragon/Géant neutre conquis = +3 Gloire supplémentaire.

Fortification ou forteresse : défenseur +200 points d'armée. Retirer seulement la fortification manuelle après bataille ; la forteresse garde son bonus naturel.

Tour magique : le défenseur dispose d'un magicien niveau 1 pour la bataille (santé 8, sauvegarde 4+). Ce bonus ne donne pas +200 points d'armée.

### Recrutements légendaires

Un joueur actif peut recruter pendant la phase d'ordres un Dragon pour 10 Gloire s'il contrôle au moins un territoire `dragon`, ou un Géant pour 8 Gloire s'il contrôle au moins un territoire `giant`. Le recrutement déduit la Gloire, incrémente `campaign_players.dragon_recruits` ou `campaign_players.giant_recruits`, et écrit un log `legendary_recruitment`. Pendant la résolution, un participant peut engager ses recrues dans une bataille via `commit_legendary_reinforcements` : Dragon +160 points, Géant +120 points. Les recrues non engagées restent en réserve et ne peuvent pas être perdues. La RPC `resolve_battle_result` valide les pertes contre les unités engagées et le stock disponible avant de décrémenter les compteurs.

### Points d’armée

```ts
export function getArmyBasePoints(turnNumber: number): number {
  return Math.min(Math.max(turnNumber - 1, 0) * 200, 2000);
}
```

Les villages ajoutent +100 points d'armée au joueur, plafonné à +200. Ce bonus s'ajoute aux points de base du tour.

### Revenus de fin de tour

À chaque fin de tour, chaque joueur actif gagne `floor(territoires contrôlés / 3)` Gloire, plus +1 Gloire par gisement contrôlé.

## 7. Supabase

Tables attendues : `profiles`, `campaigns`, `campaign_players`, `territories`, `territory_adjacencies`, `campaign_turns`, `orders`, `battles`, `battle_participants`, `explorations`, `campaign_logs`.

Activer RLS sur toutes les tables applicatives. Ne pas exposer de service role key. Côté client, utiliser seulement `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` pour compatibilité.

Règles : utilisateur lit ses campagnes, joueur modifie ses infos de lobby, maître lance/résout/termine, joueur ne lit que ses ordres avant révélation, tous lisent après révélation. La RPC de révélation peut être appelée par un joueur actif, mais elle doit refuser tant que tous les ordres actifs ne sont pas soumis.

Invitation par code : ne pas faire de lecture globale des campagnes `lobby` côté client. Utiliser `get_join_campaign_details(invite_code)` pour afficher les informations minimales d'un lobby à partir d'un code valide, puis `request_join_campaign(invite_code, ...)` pour créer une demande d'inscription. Un joueur ne doit pas pouvoir s'inscrire par un `insert` direct dans `campaign_players`.

Transitions critiques : les fonctions SQL qui révèlent automatiquement les ordres, résolvent les batailles ou terminent le tour doivent verrouiller les lignes concernées avec `for update` afin d'éviter les doubles traitements concurrents.

Fichiers à copier dans Supabase : garder chaque morceau sous 100 lignes. Si une migration dépasse cette limite, la découper en plusieurs fichiers numérotés pour éviter les collages tronqués dans le SQL Editor.

## 8. UI / UX

Interface claire, lisible, fantasy sombre, adaptée adultes/enfants, responsive. Les actions longues ou sensibles doivent afficher un état de chargement pour éviter les doubles clics. Les confirmations navigateur ne sont pas utilisées pour `Résoudre la bataille` et `Terminer le tour`; la révélation des ordres est automatique.

Messages d’erreur compréhensibles : capitale prise, cible non adjacente, territoire non contrôlé, tous les joueurs doivent valider.

La carte doit afficher couleurs joueurs, neutres en gris, type, fortification, fiche au clic.

## 9. Qualité

Avant de terminer une tâche :

```bash
npm run typecheck
npm run lint
npm run test
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

Création compte, campagne 2 joueurs, code invitation, second joueur rejoint, maître accepte, joueurs prêts, lancement, carte hexagonale, ordres secrets depuis la carte, révélation, conquête neutre automatique, bataille, Gloire, fin de tour.

## 13. Ce qu’il ne faut pas faire

Ne pas coder carte 4x4 fixe, supposer 4 joueurs, bloquer au tour 6, révéler trop tôt, réintroduire une validation manuelle du maître pour la révélation, exposer ordres secrets, tout mettre dans React, ignorer RLS, ajouter fonctionnalités hors MVP ou exposer secrets.

## 14. Définition de terminé

Une tâche est terminée si le code est implémenté, TypeScript corrigé, UI s’affiche, règles du lot respectées, états prévus, lint/build passent ou exceptions expliquées, périmètre non dépassé.
