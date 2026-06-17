# MAP_DESIGN.md
## HexRealm
### Design fonctionnel de la carte dynamique

## 1. Objectif

La carte doit permettre de comprendre rapidement : territoires, propriétaires, neutres, adjacences, fortifications, actions possibles.

Elle doit fonctionner pour 2 à 6 joueurs.

## 2. Tailles supportées

| Joueurs | Carte | Territoires |
|---:|---|---:|
| 2 | hex 5 x 4 | 20 |
| 3 | hex 6 x 5 | 30 |
| 4 | hex 7 x 5 | 35 |
| 5 | hex 8 x 6 | 48 |
| 6 | hex 9 x 6 | 54 |

Utiliser `campaign.map_width` et `campaign.map_height`.

## 3. Page carte

Route principale : `/campaigns/[campaignId]`.

La route `/campaigns/[campaignId]/map` est conservée pour compatibilité mais redirige vers la page campagne.

Desktop : header compact, carte à gauche, fiche territoire/actions à droite, légende compacte.

Mobile : header, carte scrollable, fiche sélectionnée, légende.

## 4. Carte hexagonale

Les campagnes `hex_v1_*` utilisent des territoires hexagonaux en lignes horizontales décalées. Les lignes paires sont décalées vers la droite, ce qui correspond au calcul d'adjacence à six voisins.

Règles : desktop largeur disponible, mobile scroll horizontal, territoires lisibles.

## 5. Codes techniques des territoires

Lignes A, B, C, D... Colonnes 1, 2, 3...

Exemples : x=1 y=1 -> A1 ; x=6 y=4 -> D6.

Ces codes servent aux capitales, à l'adjacence et aux scripts. Ils ne sont plus affichés dans les territoires de la carte, car les territoires ont déjà un nom.

## 6. Territoire

Structure actuelle des hexagones :

- tag de type en haut ;
- nom du territoire au centre, sur deux lignes maximum, avec une typographie compacte pour préserver le nom complet autant que possible ;
- propriétaire en bas ;
- état utile visible seulement si nécessaire : `Bataille` pour un territoire contesté, `Fortifié` pour une fortification.

Exemple :

```text
       [DR]

  Nid des Dragons

       Léa
```

## 7. États visuels

- Neutre : fond parchemin, bordure neutre, propriétaire `Neutre`.
- Contrôlé : fond teinté couleur joueur, bordure couleur joueur, propriétaire visible en bas.
- Contesté / bataille en cours : couleur dédiée rouge sombre, badge `Bataille`, fiche mise à jour.
- Sélectionné : halo lumineux, fiche mise à jour.
- Cible conquérable sélectionnée : bordure/halo vert pour signaler l'action possible.
- Fortifié : badge discret en haut de l'hexagone et mention dans la fiche.

## 8. Types et icônes provisoires

| Type | Icône | Badge |
|---|---|---|
| `capital` | 🏰 | Capitale |
| `village` | 🏘️ | Village |
| `mine` | ⛏️ | Gisement |
| `ruins` | 🗿 | Ruines |
| `fort` | 🛡️ | Fort |
| `magic_tower` | ✨ | Tour |
| `dragon` | 🐉 | Dragon |
| `giant` | 🪨 | Géant |
| `wild` | 🌲 | Sauvage |

## 9. Couleurs joueurs

Couleurs MVP : rouge, bleu, vert, jaune, violet, orange, rose, turquoise.

Une couleur ne peut être utilisée que par un joueur actif dans une campagne. Neutre = gris.

La carte doit adapter automatiquement les couleurs de texte et d'accent selon la couleur réelle de la case. Objectif : conserver un contraste lisible, y compris pour les couleurs joueur très sombres comme noir, bleu nuit ou rouge sombre. Les contours des cases sombres peuvent être éclaircis pour rester visibles sur le fond de carte.

## 10. Fiche territoire

Champs : nom, propriétaire, statut utile et actions disponibles.

Wireframe :

```text
Nid des Dragons
Propriétaire : Léa
Statut : Fortifié
[Fortifier]
```

## 11. Légende

La carte affiche une légende compacte sur une seule ligne : uniquement les tags de territoire. Les effets détaillés ne sont pas affichés en permanence ; ils apparaissent au clic ou au focus sur un tag. Les états utiles restent visibles directement dans les territoires concernés : propriétaire, type, bataille et fortification.

## 12. Carte de campagne

La page campagne affiche la carte complète, pas une miniature. Chaque hexagone affiche le tag de type en haut, le nom du territoire au centre, le propriétaire en bas et les états utiles comme bataille en cours ou fortification. Les couleurs principales de la carte correspondent aux joueurs, aux territoires neutres et aux territoires contestés.

## 13. Ordres depuis la carte

Les ordres se donnent directement depuis la carte.

Comportement actuel :

- sélectionner un territoire contrôlé affiche `Fortifier` et les cibles à portée ;
- sélectionner une cible conquérable affiche directement l'action `Conquérir` ;
- si plusieurs territoires contrôlés peuvent attaquer la cible, l'application choisit automatiquement une source valide ;
- un ordre soumis peut être annulé tant que la phase d'ordres est ouverte.

Il n'y a plus de bouton préparatoire `Conquérir depuis ...` sur les territoires contrôlés.

## 14. Comportement clic

Sur la page campagne : sélectionner un territoire affiche sa fiche et propose seulement les actions réellement possibles selon propriétaire, phase et joueur courant. La carte ne surligne plus les adjacences, car l'information utile est donnée par les actions du panneau.

## 15. Adjacences visuelles

Ne pas surligner les adjacences sur la carte. Elles restent utilisées en interne pour valider les conquêtes et afficher les actions possibles.

## 16. Fortifications

Afficher `🛡️ Fortifié` ou badge `[Fortifié]`. Si attaqué, bonus affiché dans la fiche bataille.

## 17. Accessibilité

Ne jamais communiquer uniquement par couleur. Afficher nom, propriétaire et badge. Contraste suffisant. Hexagones assez grands, minimum recommandé 120px de large.

## 18. États

Chargement : “Chargement de la carte…”
Erreur : “Impossible de charger la carte. [Réessayer]”
Carte vide : “La carte n’a pas encore été générée. Elle sera créée au lancement de la campagne.”

## 19. Cas par taille

2 joueurs : carte centrée, territoires grands. 3/4 joueurs : lisible desktop. 5/6 joueurs : plus large, scroll horizontal sur mobile.

## 20. Style graphique actuel

L'écran de campagne suit désormais une direction fantasy sombre inspirée d'un jeu de stratégie :

- fond sombre texturé ;
- panneaux bordés or ;
- typographie de titres plus médiévale ;
- carte dans un panneau sombre ;
- hexagones parchemin avec bordures fortes ;
- badges de types colorés ;
- boutons d'action stylés, avec chargement quand une action prend du temps.

Éviter : carte dessinée main, drag/drop, animations lourdes, zoom/pan avancé, fonds trop illustrés, territoires trop petits, texte trop grand dans les hexagones.

## 21. Composants conceptuels

```ts
type TerritoryCardProps = {
  code: string;
  name: string;
  type: TerritoryType;
  ownerName?: string;
  ownerColor?: string;
  isFortified: boolean;
  isContested?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
};
```

```ts
type TerritoryGridProps = {
  territories: Territory[];
  mapWidth: number;
  mapHeight: number;
  selectedTerritoryId?: string;
  contestedTerritoryIds?: string[];
  onSelectTerritory?: (territoryId: string) => void;
  compact?: boolean;
};
```

## 22. Données nécessaires

Charger : campaign, territories, campaign_players, territory_adjacencies, batailles en attente, éventuellement ordre courant.

## 23. Priorités

Must-have : grille dynamique, propriétaire, type, fortification, bataille en cours, fiche, responsive.

Should-have : carte miniature.

Could-have : icônes custom, animations, plein écran, zoom, export image.

## 24. Définition de réussite

La carte est réussie si elle fonctionne pour 2 à 6 joueurs, reste lisible, n’est pas codée en 4x4, et permet d'identifier rapidement propriétaires, neutres, batailles en cours et fortifications.
