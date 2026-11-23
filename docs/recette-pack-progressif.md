# Recette du pack progressif P1 (pause de fin de palier)

Préparée le 2026-11-23. Version en ligne : https://phonoactif.vercel.app (déploiement du commit 034c291, statut « Ready »).
À faire par JF. Durée : environ 20 minutes pour les parties A à D, plus la durée du jeu pour la partie E.
Noter pour chaque ligne : OK, ou ce qui s'est passé. Ce qui n'est pas exercé reste « non vérifié ».

## Ce qui est déjà constaté (ne pas refaire)
- Testé par Claude en local (pas en ligne), commandes complètes : 9 mots du palier 1, puis pause, annonce du palier 2, « Passer le palier suivant » vers « Carte 18 sur 93 », « Arrêter ici » vers le bilan « Arrêté après le palier 1 ».
- Testé par Claude en local, commandes épurées et voix verrouillée : les 3 boutons de l'adulte sont là, le bouton de vitesse est absent.
- Tests automatiques : 170 Vitest, 480 node.

## A. Le pack apparaît (2 min)
Ouvrir : https://phonoactif.vercel.app/#/jeu?pack=pack-progressif-p1

| # | Étape | Attendu |
|---|---|---|
| A1 | Regarder la liste de mots proposée | « Pack progressif P1 (93 mots, 18 paliers) » est dans la liste |
| A2 | Saisir le code E07, choisir ce pack, appuyer sur « Commencer » | « Carte 1 sur 93 », image de « ami » |

## B. Fin du palier 1, commandes complètes (5 min)
Jouer les 9 mots du palier 1 dans l'ordre : ami, joli, mari, sofa, mimi, ravi, volé, fumé, lama.

| # | Étape | Attendu |
|---|---|---|
| B1 | Après « Suivant » sur « lama » | Écran « On fait une pause. », aucun bouton pour l'élève (ni Écouter, ni Vérifier, ni Suivant) |
| B2 | Regarder la zone de l'adulte en dessous | « Vitesse de la voix » ouvert, puis « Palier terminé. (palier 1) » et « Palier suivant (2) : Arrivée des consonnes courtes (p, t, d, b…). » |
| B3 | Trois boutons | « Continuer avec le palier suivant » (le curseur est dessus), « Passer le palier suivant », « Arrêter ici » |
| B4 | Appuyer sur « Continuer avec le palier suivant » | « Carte 10 sur 93 », image de « papa ». **Pas encore constaté dans un navigateur.** |

## C. Passer et arrêter (3 min)
Recommencer le pack (recharger la page, même code).

| # | Étape | Attendu |
|---|---|---|
| C1 | Jouer le palier 1, appuyer sur « Passer le palier suivant » | « Carte 18 sur 93 » (le palier 2, 8 mots, est sauté) |
| C2 | Jouer jusqu'à la prochaine pause | Annonce du palier 4 (les mots qui se terminent par une consonne) : le palier 3 a été joué |
| C3 | Appuyer sur « Arrêter ici » | Bilan : « Pack terminé », « Arrêté après le palier 3. », nombre de cartes = cartes réellement jouées (pas 93) |
| C4 | « Rejouer » | Retour à « Carte 1 sur 93 », sans la mention d'arrêt |

## D. Commandes épurées et voix verrouillée (3 min)
Ouvrir : https://phonoactif.vercel.app/#/jeu?pack=pack-progressif-p1&commandes=epure&verrou=1

| # | Étape | Attendu |
|---|---|---|
| D1 | Jouer le palier 1 avec les icônes | Même pause « On fait une pause. » |
| D2 | Zone de l'adulte | Les 3 boutons sont visibles, **pas** de bouton « Vitesse de la voix » |
| D3 | Si un enfant non lecteur est devant l'écran | Il ne peut rien presser qui fasse avancer le jeu |

## E. Tâche d'enseignant avec un vrai lien d'élève (10 min)
Chemin supposé dans l'interface, à confirmer en le faisant : https://phonoactif.vercel.app/#/enseignant, connexion, choisir une classe, « Nouvelle tâche » (3 étapes : Les mots, Les réglages, Créer), puis choisir « Pack progressif P1 » dans « Modèles prêts ».

| # | Étape | Attendu |
|---|---|---|
| E1 | Étape « Les mots » : choisir le modèle | Le modèle est accepté avec ses 93 mots. **Point à observer : une liste personnelle est limitée à 50 mots, une tâche à 200 ; dire si un message de limite apparaît.** |
| E2 | Créer la tâche, ouvrir le lien personnel d'un élève | La tâche démarre |
| E3 | Jouer le palier 1 | La pause apparaît, comme en B1 à B3 |
| E4 | Après la fin du jeu, « Envoyer mes résultats » | Les essais partent (pas de mention de palier dans les résultats : c'est voulu) |

Si E1 refuse les 93 mots, la pause des tâches d'enseignant ne servira qu'à des listes de 50 mots ou moins qui respectent l'ordre du pack. Le noter, ne pas contourner.

## F. Cas limites à essayer (5 min)
| # | Étape | Attendu |
|---|---|---|
| F1 | Presser « Suivant » ou « Écouter » très vite pendant la pause | Rien ne se passe, aucun mot suivant ne s'affiche |
| F2 | Recharger la page pendant la pause | Retour à l'accueil, pas d'écran blanc (la progression n'est pas conservée : comportement existant du jeu) |
| F3 | Un autre pack de l'accueil (par exemple « 101 mots de P1 ») | Aucune pause, jeu comme avant |

## G. Écoute et lecture d'ensemble du pack (la durée qu'il faut)
Jouer les 18 paliers en entier en notant, pour chaque palier, ce qui gêne : mot trop difficile pour son palier, image trompeuse, son manquant, phrase mal dite, annonce de l'adulte incompréhensible ou fausse.
Les audios des lots 19, 20 et 22 sont déjà validés par JF (docs/ecoute-lots-19-20-22.html).

## Après la recette
Envoyer à Claude : la liste des lignes en échec avec ce qui s'est affiché (une capture suffit). Tout ce qui n'est pas passé en revue reste « non vérifié » dans le journal du logigramme.
