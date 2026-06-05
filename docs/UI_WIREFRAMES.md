# UI_WIREFRAMES.md
## HexRealm
### Wireframes fonctionnels du MVP

## 1. Objectif

Décrire les écrans principaux du MVP pour guider Codex : pages, informations, boutons, états et actions. Ce document ne définit pas le design graphique final.

## 2. Routes MVP

```text
/
/signup
/login
/dashboard
/campaigns/new
/campaigns/join
/campaigns/[campaignId]
/campaigns/[campaignId]/lobby
/campaigns/[campaignId]/map
/campaigns/[campaignId]/orders
/campaigns/[campaignId]/reveal
/campaigns/[campaignId]/results
```

## 3. Composants UI communs

`Button`, `Card`, `Input`, `Select`, `Badge`, `PageHeader`, `LoadingState`, `ErrorState`, `EmptyState`, `ConfirmDialog`.

Badges utiles : Lobby, Active, Archivée, Ordres, Résolution, Prêt, En attente, Validé, À jouer, Résolu, Neutre, Fortifié, Maître, Joueur.

## 4. Accueil `/`

Objectif : présenter l’application et orienter.

Wireframe :

```text
Header : Logo / HexRealm / Connexion

Hero :
HexRealm
Gestionnaire de campagne Age of Sigmar
Crée une campagne, invite tes joueurs, donne tes ordres en secret et conquiers la carte.
[Créer un compte] [Se connecter] [Rejoindre une campagne]

Comment ça marche ?
1. Crée une campagne
2. Invite tes joueurs
3. Donnez vos ordres
4. Jouez les batailles
```

Actions : créer compte -> `/signup`, connexion -> `/login`, rejoindre -> `/campaigns/join`.

## 5. Inscription `/signup`

Champs : email, mot de passe, pseudo. Bouton : Créer mon compte. Lien : déjà un compte ? Se connecter.

États : loading, email invalide, mot de passe invalide, pseudo vide, succès -> dashboard.

## 6. Connexion `/login`

Champs : email, mot de passe. Bouton : Se connecter. Lien : créer compte.

États : loading, identifiants invalides, succès -> dashboard.

## 7. Dashboard personnel `/dashboard`

Afficher : Bonjour, utilisateur ; boutons Créer une campagne, Rejoindre avec un code ; sections Campagnes actives, Campagnes en lobby, Campagnes terminées/archivées.

Carte campagne : nom, badge statut, rôle, saison/tour, phase, bouton ouvrir.

États : loading, aucune campagne, erreur.

## 8. Créer une campagne `/campaigns/new`

Champs : nom de campagne, nombre de joueurs 2 à 6.

Afficher aperçu dynamique : 2 = 3x3 9 territoires ; 3 = 4x3 12 ; 4 = 4x4 16 ; 5 = 5x4 20 ; 6 = 6x4 24.

Texte : Campagne ouverte, pas de limite automatique de tours.

Boutons : Créer la campagne, Annuler. Après création -> lobby.

## 9. Rejoindre une campagne `/campaigns/join`

Étape 1 : code invitation + bouton chercher.

Étape 2 après code valide : nom campagne, joueurs attendus/places, pseudo dans la campagne, faction AoS, couleur, capitale souhaitée, bouton demander.

États : code invalide, campagne inexistante, plus en lobby, pleine, couleur/capitale prise, demande envoyée.

## 10. Lobby `/campaigns/[campaignId]/lobby`

Afficher : nom, Lobby, code, copier code, joueurs x/y.

Liste joueurs : nom, faction, couleur, capitale, badges prêt/statut. Demandes pending avec Accepter/Refuser pour le maître.

Bloc Mes réglages : pseudo, faction, couleur, capitale, enregistrer, prêt/pas prêt.

Actions maître : Lancer la campagne, avec messages si impossible : joueur manquant, pas prêt, couleur doublon, capitale doublon. Confirmation obligatoire.

## 11. Dashboard campagne `/campaigns/[campaignId]`

Afficher : nom, Saison 1 — Tour X, phase, points d’armée, carte interactive, panneau de territoire sélectionné, actions possibles, classement, statut des ordres, historique récent.

Actions joueur : sélectionner un territoire, fortifier un territoire contrôlé, cliquer une cible conquérable, valider `Conquérir`, annuler un ordre soumis tant que la phase d'ordres est ouverte, voir les batailles/résultats selon la phase.

Actions maître selon phase : Résultats, Finir le tour.

Bloc progression : trois étapes visibles `Ordres`, `Révélation`, `Résultats`. L'étape `Révélation` devient active automatiquement quand tous les ordres sont validés. Le bloc résultats affiche l'avancement des batailles et propose la saisie des résultats ou la fin de tour.

## 12. Carte interactive `/campaigns/[campaignId]/map`

Route conservée pour compatibilité, mais elle redirige vers `/campaigns/[campaignId]`.

Layout desktop de la page campagne : carte à gauche, fiche territoire/actions à droite.

Mobile : carte en haut, fiche en dessous.

Territoire hexagonal : nom du territoire, icône type, propriétaire, couleur du joueur ou couleur neutre, badge bataille/fortifié si utile. Le code technique du territoire n'est pas affiché sur la carte.

Fiche : nom, propriétaire, statut utile et actions disponibles.

États : aucun territoire sélectionné, sélectionné, erreur.

## 13. Donner mes ordres `/campaigns/[campaignId]/orders`

Route conservée pour compatibilité, mais elle redirige vers `/campaigns/[campaignId]`.

Étapes sur la page campagne :

1. Cliquer un territoire contrôlé pour voir `Fortifier` et les cibles à portée.
2. Cliquer une cible conquérable pour faire apparaître l'action de conquête.
3. Valider l'ordre.

N’afficher que les sources contrôlées et cibles valides. Si ordre validé : montrer résumé + bouton `Annuler l'ordre`. Un nouvel ordre peut remplacer l'ancien tant que la phase est `orders`.

États : aucun territoire contrôlé, aucune cible valide, ordre validé, ordre annulé, phase incorrecte.

## 14. Révélation `/campaigns/[campaignId]/reveal`

Avant révélation : liste statuts joueurs. Dès que tous les joueurs actifs ont validé, la révélation se déclenche automatiquement.

Quand tous validés : passage automatique en révélation. Si aucune bataille n'est générée, afficher un message et ouvrir directement le tour suivant ; sinon passer en résolution.

Après révélation : tableau joueur/action/source/cible + bouton voir résultats à résoudre.

## 15. Résultats `/campaigns/[campaignId]/results`

Section Conquêtes automatiques : territoire, joueur, D6 automatique, réussite/échec.

Section Batailles : participants, territoire, points, bonus éventuel, vainqueur, notes, bouton Valider résultat.

Section Fin de tour : bouton Finir le tour, message si impossible.

Version joueur non maître : lecture seule.

## 16. Historique

Sur dashboard campagne : afficher les 5 à 10 derniers événements, groupés par tour si possible.

## 17. États globaux

Chaque page avec données : loading, erreur avec réessayer, vide, accès refusé.

## 18. Responsive

Desktop : panneaux côte à côte. Tablette : compact. Mobile : tout empilé, carte scrollable horizontalement, boutons pleine largeur.

## 19. Style provisoire

Fantasy lisible, parchemin léger, couleurs chaudes, contraste suffisant, pas trop sombre ni chargé.

## 20. Priorité design MVP

Lisibilité, compréhension des actions, carte claire, statut des ordres, résolution simple. La beauté vient après.

## 21. À ne pas faire

Pas de chat, boutique, héros, mercenaires, alliances, diplomatie, éditeur de carte, upload images, animations complexes, drag and drop obligatoire.

## 22. Définition d’un écran réussi

L’utilisateur comprend où il est, ce qu’il doit faire, l’action principale, pourquoi une action est bloquée, et ce qui se passe après validation.
