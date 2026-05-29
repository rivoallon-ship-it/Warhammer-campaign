# MAP_DESIGN.md
## Les Couronnes Brisées
### Design fonctionnel de la carte dynamique

## 1. Objectif

La carte doit permettre de comprendre rapidement : territoires, propriétaires, neutres, adjacences, fortifications, actions possibles.

Elle doit fonctionner pour 2 à 6 joueurs.

## 2. Tailles supportées

| Joueurs | Carte | Territoires |
|---:|---|---:|
| 2 | 3 x 3 | 9 |
| 3 | 4 x 3 | 12 |
| 4 | 4 x 4 | 16 |
| 5 | 5 x 4 | 20 |
| 6 | 6 x 4 | 24 |

Utiliser `campaign.map_width` et `campaign.map_height`.

## 3. Page carte

Route : `/campaigns/[campaignId]/map`.

Desktop : header, carte à gauche, fiche territoire à droite, légende en bas.

Mobile : header, carte scrollable, fiche sélectionnée, légende.

## 4. Grille dynamique

CSS conceptuel :

```css
grid-template-columns: repeat(mapWidth, minmax(90px, 1fr));
grid-template-rows: repeat(mapHeight, minmax(90px, auto));
```

Règles : desktop largeur disponible, mobile scroll horizontal, cases lisibles.

## 5. Codes territoires

Lignes A, B, C, D... Colonnes 1, 2, 3...

Exemples : x=1 y=1 -> A1 ; x=6 y=4 -> D6.

## 6. Case territoire

Structure : code, icône type, nom court, propriétaire, badges type/fortifié.

Exemple :

```text
+---------------------------+
| A3                    🐉  |
| Nid des Dragons           |
| Léa                       |
| [Dragon] [Fortifié]       |
+---------------------------+
```

## 7. États visuels

- Neutre : fond gris clair, bordure grise, texte Neutre.
- Contrôlé : fond teinté couleur joueur, bordure couleur joueur, propriétaire visible.
- Sélectionné : bordure épaisse, surbrillance, fiche mise à jour.
- Fortifié : badge ou icône bouclier.
- Cible valide pendant ordres : surbrillance positive.

## 8. Types et icônes provisoires

| Type | Icône | Badge |
|---|---|---|
| `capital` | 🏰 | Capitale |
| `village` | 🏘️ | Village |
| `ruins` | 🗿 | Ruines |
| `fort` | 🛡️ | Fort |
| `magic_tower` | ✨ | Tour |
| `dragon` | 🐉 | Dragon |
| `giant` | 🪨 | Géant |
| `wild` | 🌲 | Sauvage |

## 9. Couleurs joueurs

Couleurs MVP : rouge, bleu, vert, jaune, violet, orange, rose, turquoise.

Une couleur ne peut être utilisée que par un joueur actif dans une campagne. Utiliser fond clair + bordure forte pour préserver la lisibilité. Neutre = gris.

## 10. Fiche territoire

Champs : code, nom, type, propriétaire, fortifié, faction locale, adjacents.

Wireframe :

```text
A3 — Nid des Dragons
Type : Dragon
Propriétaire : Léa
Statut : Fortifié
Faction locale : Dragon
Adjacent à : A2, A4, B3
Bonus : Territoire narratif Dragon
```

## 11. Légende

Afficher icônes et badges : Capitale, Village, Ruines, Fort, Tour, Dragon, Géant, Sauvage, Fortifié. Sur mobile, légende repliable possible.

## 12. Carte miniature

Dashboard campagne : version compacte avec code, couleur propriétaire, icône type éventuellement, fortification. Pas besoin de noms complets.

## 13. Carte dans l’écran d’ordres

Les ordres peuvent être donnés via listes déroulantes. La carte sert d’aide visuelle : source sélectionnée, cibles valides en surbrillance.

## 14. Comportement clic

Sur page carte : sélectionner case, afficher fiche, surligner adjacents. Sur page ordres : MVP recommandé = listes déroulantes pour action principale, carte comme aide visuelle.

## 15. Adjacences visuelles

Quand un territoire est sélectionné, surligner légèrement ses adjacents.

## 16. Fortifications

Afficher `🛡️ Fortifié` ou badge `[Fortifié]`. Si attaqué, bonus affiché dans la fiche bataille.

## 17. Accessibilité

Ne jamais communiquer uniquement par couleur. Afficher nom/code, propriétaire, badge. Contraste suffisant. Cases assez grandes, minimum recommandé 90px x 90px.

## 18. États

Chargement : “Chargement de la carte…”
Erreur : “Impossible de charger la carte. [Réessayer]”
Carte vide : “La carte n’a pas encore été générée. Elle sera créée au lancement de la campagne.”

## 19. Cas par taille

2 joueurs : carte centrée, cases grandes. 3/4 joueurs : lisible desktop. 5/6 joueurs : plus large, scroll horizontal sur mobile.

## 20. Style MVP

Cartes rectangulaires, coins arrondis, bordures visibles, fond parchemin léger, badges simples, icônes emoji ou lucide-icons.

Éviter : carte dessinée main, hexagones complexes, drag/drop, animations lourdes, zoom/pan avancé, fonds trop illustrés, cases trop petites.

## 21. Composants conceptuels

```ts
type TerritoryCardProps = {
  code: string;
  name: string;
  type: TerritoryType;
  ownerName?: string;
  ownerColor?: string;
  isFortified: boolean;
  isSelected?: boolean;
  isAdjacent?: boolean;
  isValidTarget?: boolean;
  onClick?: () => void;
};
```

```ts
type TerritoryGridProps = {
  territories: Territory[];
  mapWidth: number;
  mapHeight: number;
  selectedTerritoryId?: string;
  highlightedTerritoryIds?: string[];
  validTargetIds?: string[];
  onSelectTerritory?: (territoryId: string) => void;
  compact?: boolean;
};
```

## 22. Données nécessaires

Charger : campaign, territories, campaign_players, territory_adjacencies, éventuellement ordre courant.

## 23. Priorités

Must-have : grille dynamique, propriétaire, type, fortification, fiche, légende, responsive.

Should-have : surlignage adjacents, carte miniature, surlignage cibles valides.

Could-have : icônes custom, animations, plein écran, zoom, export image.

## 24. Définition de réussite

La carte est réussie si elle fonctionne pour 2 à 6 joueurs, reste lisible, n’est pas codée en 4x4, propriétaires/neutres/fortifications/adjacences sont compréhensibles, et les joueurs comprennent quoi conquérir ou fortifier.
