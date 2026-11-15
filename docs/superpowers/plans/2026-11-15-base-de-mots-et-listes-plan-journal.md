# Journal d'exécution — base de mots et listes (2026-11-15)

Plan : `2026-11-15-base-de-mots-et-listes-plan.md`. Méthode : exécution native, TDD (test écrit et vu en échec avant le code). Rien n'est commité.

| Tâche | État | Preuve (constaté) |
|---|---|---|
| 1 Amorcer la base | faite | `node --test tests/tools/base-amorcer.test.js` : 4 réussis ; 156 fiches, 6 packs, 0 conflit |
| 2 Recompiler les packs | faite | `tests/tools/base-compiler.test.js` : 6 réussis (manifestes équivalents, fichiers identiques octet pour octet) |
| 3 Publier `public/mots/` | faite | `tests/tools/base-publier.test.js` : 2 réussis ; `fiches.json` 131 Ko ; 156 mots |
| 4 Règles des listes | faite | `tests/core/liste.test.js` : 8 réussis |
| 5 Chargeur par identifiant + `urlFichier` | faite | `tests/app/chargerMots.test.js` : 6 réussis ; `Jeu.jsx` : 5 adresses remplacées, suite UI inchangée |
| 6 Migration SQL | écrite, NON APPLIQUÉE | `npm run test:sql` : 52 réussis (dont 6 nouveaux) |
| 7 Accès aux listes, création de tâche | faite | `tests/enseignant/listes.test.js` : 8 réussis ; `tests/sync/envoi.test.js` : 15 |
| 8 Interface enseignant | faite | `tests/enseignant/listes-ui.test.jsx` : 9 réussis ; anciens tests « Pack de cartes » réécrits |
| 9 Côté élève | faite | `tests/app/taches-a-listes.test.jsx` : 3 réussis |
| 10 Retrait des anciens packs | NON FAITE (attend le GO de JF) | |

Suites au dernier passage (après la revue) : `npm test` 438, `npm run test:ui` 124, `npm run test:sql` 52, `npx vite build` sans erreur. Non vérifié : essai dans un navigateur réel (jsdom seulement), migration sur la vraie base.

## Rulings (décisions prises sans JF)
- Task 1 — `fusionnerCartes` retourne `{ fiche, conflits }` (le plan disait `Fiche`) : il faut remonter les conflits. Coût si faux : aucun.
- Task 1 — l'identifiant de la base est `identifiantCarte(mot)` (ASCII). 13 cartes de `p1-100` avaient un identifiant accentué (« vélo ») ; la base SQL n'accepte que `[a-z0-9-]`. Coût si faux : les identifiants des 13 cartes changent dans les packs recompilés.
- Task 2 — l'union des champs ajoute `niveau: 'P1'` aux 20 mots communs de `p1-100` (et `syllabes` à 11). Différences admises et listées dans le test. Coût si faux : un champ en plus, sans effet sur le jeu.
- Task 3 — le catalogue porte aussi `audio` (fichier du mot entier) pour le bouton « Écouter ».
- Task 6 — pas de déclencheur `updated_at` : la colonne est mise à jour par le client. Raison : ne pas recréer un déclencheur partagé (règle du dépôt).
- Task 7 — `enregistrerListe(client, userId, liste, { catalogueIds })` : le 4e argument porte le catalogue pour refuser les mots inconnus.
- Task 8 — les mots d'une liste absents du catalogue sont ignorés à la création d'une tâche. Les « packs personnels » (inexistants aujourd'hui) disparaissent de l'espace enseignant ; le modèle Excel reste la voie pour proposer des mots.
- Task 8 — réordonner une liste se fait par boutons « Monter / Descendre » (pas de glisser-déposer).

## Revue finale (relecteur indépendant, modèle le plus capable) — constats et suites
Aucun Critique. Trois Important, tous corrigés avec un test écrit d'abord :
- I2 (RGPD) : le nom d'une liste (« Mots pour Théo… ») était copié dans `phono_tasks.pack`, que `phono_lire_tache` renvoie à tout porteur du lien élève. Corrigé : `pack` = « Liste », les noms restent dans `listes_noms` (non renvoyé). L'écran enseignant affiche les noms. Au passage, un test a révélé que mon propre correctif avait supprimé l'écriture de `mode_mot` et `habillage` : corrigé et testé.
- I3 : deux mots donnant le même identifiant (là / la) devenaient deux fiches silencieuses. Corrigé : `amorcer` signale le conflit (et tout identifiant hors `[a-z0-9-]{1,60}`), `publier` refuse une base à identifiants en double.
- I1 : déployer le code avant la migration casse l'espace enseignant. Règle ajoutée dans l'en-tête de la migration : **appliquer la migration AVANT de pousser**.
Mineurs corrigés : M1 (catalogue en 404/500 : message), M2 (confirmation avant suppression d'une liste), M6 (coupe sans casser un émoji ; longueur du nom comptée en caractères comme la base), M9 (menu « Partir d'un modèle » contrôlé), M10 (`set search_path` de `phono_ids_valides`), styles de l'éditeur ajoutés (M8).

### Deferred minors (non traités, à ta décision)
- M3 : le compteur « (n mots) » d'une liste est brut ; les mots retirés du catalogue sont ignorés sans le dire.
- M4 : `chargerMots` ne valide pas les fiches comme `chargerPack` ; `urlFichier` n'écarte pas `..` (données issues de `publier`, risque faible).
- M5 : un identifiant mal formé hors interface est refusé par la base avec un message anglais.
- M7 : les essais locaux enregistrent `pack: 'liste'` pour toute tâche à listes (l'export CSV ne dit pas quelle liste).
- M8 : le filtre « par son » est en fait une recherche par groupe de lettres (le mode d'emploi dit « par son ») ; mise en page 375 px non vérifiée.
