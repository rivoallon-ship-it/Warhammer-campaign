# PRODUCT_SPEC.md
## Les Couronnes Brisées
### Gestionnaire de campagne en ligne pour Warhammer Age of Sigmar

## 1. Vision produit

**Les Couronnes Brisées** est une application web permettant de gérer une campagne narrative de conquête pour **Warhammer Age of Sigmar**.

L’application aide les joueurs à créer une campagne en ligne, inviter d’autres joueurs, rejoindre une partie avec un code, visualiser une carte de territoires, donner des ordres secrets, révéler les ordres en même temps, générer les batailles à jouer, résoudre les explorations, saisir les résultats, mettre à jour automatiquement les territoires, la Gloire et le tour de campagne.

Le site ne remplace pas les règles Age of Sigmar. Il gère uniquement la couche de campagne.

## 2. Objectifs du MVP

Le MVP doit permettre de jouer une campagne complète en ligne avec un nombre de joueurs modulable : création de compte, connexion, profil joueur, création de campagne, choix du nombre de joueurs de 2 à 6, génération automatique d’une carte adaptée, invitation par code, lobby, validation des joueurs par le maître, choix de faction/couleur/capitale, lancement, carte interactive, ordres secrets, révélation simultanée, batailles, explorations, résultats, Gloire, passage au tour suivant et campagne ouverte.

## 3. Hors périmètre du MVP

Ne pas développer en V1 : héros, progression des héros, XP, blessures, artefacts, mercenaires, Dragons et Géants comme système actif, Influence Dragon/Géant, alliances, trahisons, détachements, raids avancés, garnisons avancées, diversions, éditeur de carte, cartes non rectangulaires, cases bloquées, chat intégré, notifications, paiement, rôles admin globaux, application mobile native.

## 4. Public cible

L’application est pensée pour des groupes de joueurs Age of Sigmar, des familles, des adultes jouant avec des enfants et des joueurs qui veulent une campagne simple sans gérer les règles à la main. L’interface doit être claire, visuelle et accessible.

## 5. Principes UX

- Simplicité : afficher uniquement les options pertinentes.
- Secret : les ordres sont secrets jusqu’à la révélation.
- Lisibilité : toujours indiquer ce que le joueur possède, ce qu’il peut faire, et ce qu’il doit jouer.
- Automatisation : génération carte, adjacence, validation ordres, révélation, batailles, explorations, Gloire et tours.

## 6. Rôles utilisateurs

### Utilisateur connecté

Peut créer une campagne, rejoindre une campagne, voir son tableau de bord et modifier son profil.

### Joueur de campagne

Peut voir la campagne, la carte, ses ordres, les ordres révélés, les batailles, les résultats, la Gloire et les territoires.

### Maître de campagne

Peut accepter/refuser des joueurs, lancer la campagne, révéler les ordres, résoudre les explorations, saisir les résultats de bataille, terminer le tour et corriger certains éléments. Dans le MVP, il ne voit pas les détails des ordres secrets avant révélation.

## 7. Campagnes ouvertes

Une campagne n’a pas de nombre de tours maximum obligatoire. L’application affiche `Saison 1 — Tour X`. Il n’y a pas de fin automatique au tour 6.

Progression des armées :

| Tours | Taille d’armée de base |
|---|---:|
| 1-2 | 750 points |
| 3-4 | 1 000 points |
| 5-6 | 1 250 points |
| 7+ | 1 500 points |

## 8. Nombre de joueurs modulable

Une campagne peut être créée pour **2 à 6 joueurs**.

| Joueurs | Taille de carte | Territoires |
|---:|---|---:|
| 2 | 3 x 3 | 9 |
| 3 | 4 x 3 | 12 |
| 4 | 4 x 4 | 16 |
| 5 | 5 x 4 | 20 |
| 6 | 6 x 4 | 24 |

L’application ne doit jamais supposer que la carte est toujours 4 x 4.

## 9. Capitales de départ

| Joueurs | Capitales disponibles |
|---:|---|
| 2 | A1, C3 |
| 3 | A1, A4, C2 |
| 4 | A1, A4, D1, D4 |
| 5 | A1, A5, D1, D5, B3 |
| 6 | A1, A6, D1, D6, B3, C4 |

Capitales centrales fortifiées : 5 joueurs = B3 ; 6 joueurs = B3, C4.

## 10. Types de territoires

Types MVP : `capital`, `village`, `ruins`, `fort`, `magic_tower`, `dragon`, `giant`, `wild`.

Dans le MVP, les types donnent surtout de l’identité à la carte. Les bonus détaillés viendront plus tard.

## 11. Carte et adjacence

La carte est une grille rectangulaire. Deux territoires sont adjacents s’ils se touchent horizontalement ou verticalement. Les diagonales ne sont pas adjacentes.

## 12. Lobby de campagne

Le lobby affiche nom de campagne, code d’invitation, nombre de joueurs attendus, joueurs inscrits, faction, couleur, capitale, prêt/pas prêt.

Le maître peut lancer si : joueurs actifs = joueurs prévus, tous prêts, faction renseignée, couleur unique, capitale unique.

## 13. Déroulement d’un tour

1. Ordres secrets.
2. Révélation.
3. Génération des batailles et explorations.
4. Résolution des explorations.
5. Saisie des résultats de bataille.
6. Fin de tour.
7. Passage au tour suivant.

## 14. Ordres disponibles

Chaque joueur actif peut soumettre **un ordre par tour** : `attack`, `explore`, `fortify`.

## 15. Validation des ordres

- `attack` : source au joueur, cible adjacente, cible ennemie.
- `explore` : source au joueur, cible adjacente, cible neutre.
- `fortify` : cible contrôlée par le joueur.

## 16. Révélation des ordres

Quand tous les joueurs actifs ont soumis leurs ordres, le maître peut révéler. Après révélation, tous les ordres deviennent visibles, les batailles/explorations sont générées, les fortifications appliquées, et la campagne passe en résolution.

## 17. Batailles

Si l’attaquant gagne : territoire à l’attaquant, attaquant +3 Gloire, défenseur +1 Gloire.

Si le défenseur gagne : territoire inchangé, défenseur +2 Gloire, attaquant +1 Gloire.

Si le territoire était fortifié : bonus affiché puis fortification retirée après la bataille. Bonus MVP : défenseur commence avec +1 point de commandement au round 1.

## 18. Explorations

D6 : 1-2 échec, 3-6 succès. Dans tous les cas, joueur +1 Gloire. En cas de succès, le territoire passe au joueur.

## 19. Fortifications

Un territoire peut être fortifié ou non. Un territoire déjà fortifié ne gagne pas de niveau supplémentaire. Une fortification utilisée lors d’une bataille est retirée après la bataille.

## 20. Gloire

Gains MVP : exploration +1, attaquant victorieux +3, défenseur victorieux +2, perdant d’une bataille +1.

## 21. Fin de tour

Le maître termine le tour quand toutes les explorations et batailles sont résolues. Un nouveau tour est créé, la taille d’armée recalculée, et les joueurs peuvent soumettre de nouveaux ordres.

## 22. Tableaux de bord

Le dashboard personnel affiche campagnes en lobby, actives, terminées/archivées. Le dashboard de campagne affiche nom, saison, tour, phase, taille d’armée, carte miniature, classement, statut des ordres, actions disponibles et historique récent.

## 23. Carte interactive

La carte utilise `map_width`, `map_height` et les territoires générés. Chaque case affiche code, nom court, type, propriétaire, couleur du propriétaire et fortification.

## 24. Historique simple

Enregistrer : campagne créée, joueur rejoint, joueur accepté, campagne lancée, ordres révélés, exploration réussie/échouée, bataille résolue, territoire fortifié, tour terminé.

## 25. Messages d’erreur clés

Messages simples : campagne inexistante, campagne plus en lobby, couleur/capitale prise, territoire non contrôlé, cible non adjacente, attaque seulement contre ennemi, exploration seulement neutre, tous les joueurs doivent valider, toutes les batailles doivent être résolues.

## 26. Priorités MVP

1. Auth, profil, création/rejoindre/lobby/lancement.
2. Génération de carte et affichage territoires.
3. Ordres secrets, révélation, génération batailles/explorations.
4. Résolution, Gloire, fin de tour, historique.

## 27. Définition du MVP terminé

Le scénario complet doit fonctionner de la création de compte jusqu’au passage au tour suivant, sans limite automatique de fin.

## 28. Futures versions

V2 héros ; V3 Dragons/Géants/mercenaires ; V4 détachements ; V5 diplomatie ; V6 cartes avancées.
