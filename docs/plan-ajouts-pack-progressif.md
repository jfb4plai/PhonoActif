# Plan d'ajouts : mots du pack progressif P1 au catalogue (2026-11-22)

Statut : plan, rien n'est créé ni publié. Source des mots : `docs/plan-apport-virginie-pack-progressif.md` (noyau 65 mots, paliers 1 à 7 ; suite 20 mots, paliers 8 à 12 ; palier final F, 8 mots proposés). Tableau mot par mot : `docs/plan-ajouts-pack-progressif.xlsx` (filtrable). Statuts : constaté (lu dans les fichiers le 2026-11-22), déduit, non vérifié.

## 1. Changement du jour

« mémé » est remplacé par **« lama »** au palier 1. Raison : mémé n'avait pas de fiche (son identifiant « meme » est déjà celui de « même »). Lama : l-a-m-a, deux syllabes ouvertes, consonnes longues, aucune lettre muette, aucun digraphe, aucune paire visuelle ni jumeau phonétique dans le mot (script sur `data/lexique.json`) ; hors liste P1 / VOB (†) ; se dessine comme un animal. Autres candidats trouvés et écartés : « lavé », « salé » (adjectifs, image ambiguë), « fini », « mini » (non dessinables). Choix à confirmer par JF.

## 2. État actuel du noyau (constaté, 65 mots)

| État de la fiche | Mots |
|---|---|
| Publiés, valides (image, phrase, audio en place) | 14 |
| Brouillon (image validée, phrase écrite ; audio Azure et publication en attente) | 11 : sofa, joli, mari, mimi, ravi, volé, fumé, rôti, télé, épi, midi |
| Absents du catalogue | 40 |
| dont sans image prévue (abstraits : mal, lis, vol, vis, foi, an, plus « sur » déjà publié) | 7 |
| dont image à générer | 35 (y compris les mots déjà au catalogue sans image : à vérifier mot par mot) |

La suite (paliers 8 à 12) : 20 mots, 3 au catalogue, 17 absents (mimosa ajouté au palier 12). Le palier final F : 8 mots, café déjà au catalogue, 7 absents. Total du pack : 93 mots (65 + 20 + 8), 64 absents du catalogue.

## 3. Données nécessaires par mot (une fiche complète)

| Donnée | D'où elle vient | Qui |
|---|---|---|
| Image 200×200 px, papier découpé, fond `#cde7f7`, un seul sujet, aucun texte | Canva, une image à la fois (~6 min entre deux) ; fiche d'intention d'abord (ce que voit un enfant de 6 ans, couleur en hexadécimal) | Claude propose, **JF valide image par image** |
| Phrase d'aide accordée à l'image, mot cible tel quel (sans accord) | écrite d'après l'image | Claude propose, JF valide |
| Lettres, cubes, états lettre par lettre, syllabes | `node tools/base/ajouter_mots.js <lot>` : calcul déterministe sur le lexique | outil, sans IA |
| Audio des états et des syllabes | `generer-bibliotheque.py pack <nom>` | **JF** (clé Azure) |
| Audio de la phrase | `generer-c2-packs.py azure <nom>` | **JF** (clé Azure) |
| Statut « valide » | `ajouter_mots.js finaliser <nom> <dossier-audio>` puis `publier.js` | Claude, après l'audio de JF |
| Mot abstrait (mal, lis, vol, vis, foi, an, ici) | pas d'image ; mot dit ou affiché selon le réglage | décision de JF par mot |

Les mots ne sont jamais choisis par l'IA : la liste vient du plan validé par JF.

## 4. Lots proposés (skill `phonoactif-nouveaux-mots`, 12 mots par lot)

Les lots 1 à 15 existent déjà ; la numérotation continue à 16 (lots 16 à 21 : 12 + 12 + 12 + 12 + 12 + 4 mots). L'ordre suit les paliers, pour que les premiers paliers soient jouables au plus vite.

| Lot | Mots (64 absents : 40 du noyau + 17 de la suite + 7 du palier final) | Paliers |
|---|---|---|
| Fin du lot 15 | audio Azure + finalisation des 11 brouillons ; « mémé » sort du lot (fichier `data/base/lots/pack-progressif-p1-lot15.json` : entrée à retirer, image `meme.png` inutilisée) | 1-2 |
| 16 | lama, poli, vie, fée, fumée, vue, série, revue, momie, fil, mur, sol | 1 à 4 |
| 17 | mal*, lis*, vol*, vis*, jus, riz, lilas, avis, salut, fou, mou, filou | 4 à 6a |
| 18 | savon, salon, melon, an*, fin, vin, marin, roi, foi*, jeu, main, pain | 6b à 7 |
| 19 | faim, veau, sein, sain + chéri, fichu, léché, jet, volet, minet, sujet, zéro (suite) | 7 à 10 |
| 20 | ici*, ciné, vivre, film, avril, mimosa, safari, salami, révolu + déjà*, cela*, cinéma (palier final F) | 10 à 12 et F |
| 21 | canapé, pavé, pédalo, mécano (palier final F, 4 mots) | F |

`*` = sans image prévue. Décision 2026-11-22 : le pack n'est publié qu'avec les 12 paliers complets, donc après le lot 21 ; aucun pack partiel n'est jouable avant. Pour tester le jeu avant, un pack de test à 2 paliers peut servir (non publié).

## 5. Ordre de travail et points d'arrêt

1. **Maintenant** : JF confirme « lama » (ou propose un autre mot).
2. JF lance l'audio des 11 brouillons du lot 15 (commandes à fournir en bloc PowerShell avec chemins absolus).
3. Lot 16 : fiche d'intention (tableau des 12 mots) → **arrêt, validation JF** → génération image par image → **validation JF** → phrases → **validation JF** → `ajouter_mots.js` → audio par JF → finalisation → `publier.js`, `npm test`, `npx vite build` → commit (fichiers du lot seulement) → contrôle en ligne.
4. Lots 17 à 21 : même cycle.
5. En parallèle ou après : **B3, le pack à paliers ordonnés** (aujourd'hui l'app n'a ni pack ni notion de palier). Il faut le construire (B3) puis la fin de palier (B3b) avant la publication ; l'option « un pack ordinaire par palier » est abandonnée, car JF veut un seul pack complet de 12 paliers.

## 6. Coûts et risques (déduit, à confirmer)

- Génération Canva : ~6 min par image, 56 images à générer (tous les mots absents, plus les mots du catalogue sans image à vérifier), soit ~5,5 h de génération cumulée au minimum, plus les refus (2-3 essais pour les mots délicats). C'est le goulot.
- Audio Azure : une session par lot pour JF ; la phrase doit contenir le mot tel quel, sinon le script signale « mot non repéré ».
- Homophones et ambiguïtés d'image : vie/vis, vue/revue, sein/sain/main/pain/faim, fin/faim, mur/mûr, jus (image d'un verre ?) : chaque image doit être nommée par ce qu'un enfant de 6 ans y voit avant d'être gardée.
- 27 mots du noyau sont hors liste P1 / VOB (†) : leur niveau P1 est à valider par JF avant d'investir une image.
- Rien n'a été testé avec des élèves : l'ordre des paliers est une proposition.

## 7. Décisions de JF (2026-11-22)

1. **Lama** remplace mémé : accepté.
2. **Mots sans image** : mal, lis, vol, vis, foi, an, ici : confirmés.
3. **Mots † (hors liste P1 / VOB)** : tous gardés.
4. **Publication : le pack doit être complet pour être joué, avec les 12 paliers et le palier final F** (93 mots : noyau 65 + suite 20 + final 8). Aucun palier n'est publié seul : le pack n'apparaît dans l'app que lorsque tous ses mots ont image (ou « sans image » décidé), phrase et audio. Conséquence : les lots 15 à 21 se travaillent sans publication intermédiaire du pack. Écarts levés le 2026-11-22 : la suite compte 20 mots (mimosa ajouté au palier 12, seul candidat valide du script avec « résumé », écarté car abstrait) ; le palier final F a 8 mots proposés. **Demande « 58 mots » : impossible**, le script trouve 25 candidats au total (voir `docs/plan-apport-virginie-pack-progressif.md`) ; **les 8 mots proposés sont validés par JF (2026-11-22)** : déjà, cela, cinéma, café, canapé, pavé, pédalo, mécano ; le cumul des consonnes courtes dans ce palier est accepté.

## 8. Nouvelle exigence : fin de palier, commandes pour l'adulte (JF, 2026-11-22)

Quand le pack progressif est joué avec un adulte, à la fin de chaque palier l'app **annonce la difficulté du palier suivant**, et l'adulte choisit : **arrêter**, **suivre**, ou **passer ce palier**. Ces commandes sont **sous le bouton des réglages de la voix** (zone adulte, hors zone de travail de l'élève).

Ce que cela suppose (déduit, rien n'est codé) :
- **Données** : un pack à paliers ordonnés, chaque palier avec un nom, une phrase de difficulté lisible par l'adulte (tirée de la colonne « Difficulté ajoutée au socle » du plan) et ses mots. Les packs ordinaires restent inchangés (aucune commande de palier affichée).
- **Fin de palier** : le jeu s'arrête avant la première carte du palier suivant. Hypothèse (non donnée par JF) : l'écran de l'élève affiche un message neutre du type « Palier terminé » sans lecture obligatoire, et l'annonce de la difficulté et les trois commandes se trouvent dans la zone adulte, repliée sous « Vitesse de la voix » ; à confirmer : le panneau s'ouvre-t-il tout seul à la fin d'un palier, pour que l'adulte le voie ?
- **Les trois commandes** : « Suivre » reprend à la première carte du palier suivant ; « Passer ce palier » saute au suivant (et annonce sa difficulté) ; « Arrêter » ferme la séance avec le bilan. Le choix est celui de l'adulte, jamais automatique (règle du plan : aucune décision automatique sur l'élève). Le palier passé est enregistré dans l'essai, pour que le bilan dise ce qui n'a pas été joué.
- **Pas de nouvelle table** supposée : à vérifier au code avant d'annoncer (le plan B4 fait la même hypothèse).
- **Tests** : adulte replié par défaut (comme le réglage de vitesse), accessibilité clavier, 44 px, 375 px ; parcours réel à tester sur un pack de test à 2 paliers avant le vrai pack.
- Les phrases de difficulté décrivent des faits de graphie (« lettre muette finale », « digraphe on »), sans affirmation sur l'apprentissage, donc sans référence scientifique à vérifier dans le RISS ; toute phrase qui en contiendrait une passe par le RISS avant écriture.

Cette fonction est la tâche **B3b** (après B3, le pack à paliers ordonnés), à construire avant la publication du pack.
