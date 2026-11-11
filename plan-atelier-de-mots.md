# Atelier de mots dans PhonoActif — plan par lots testables (brouillon, 2026-11-10)

Statut : proposition, rien n'est construit dans l'app. S'appuie sur `phonoactif-spec.md` (v0.2, option B React + Supabase décidée) sans la modifier. Ce qui n'est pas vérifié est marqué [non vérifié].

## Hypothèses (non données par JF)
- L'« atelier » est un module de PhonoActif ; le jeu (cubes, bouches) reste séparé.
- Les enseignants déposent un Excel dont la colonne A contient les mots.
- Première version sans génération d'images côté serveur.

## Ce qui existe déjà hors app (constaté par exécution, dossier `pas-a-son-fiche-mot\`)
| Brique | Fichier | Preuve |
|---|---|---|
| IPA de 14 964 mots (ManuLemme converti, e muet final retiré) | `convertir_manulemme.py`, `manulemme-ipa.json` | exécuté |
| Segmentation graphème-phonème des mêmes mots (colonnes 13 à 15 de ManuLemme, déjà établie par les auteurs) | `extraire_segmentation.py`, `segmentation-manulemme.json` | exécuté ; 14 964 mots |
| Aligneur de secours pour mots absents (Eqol) | `aligner_graphemes.py`, `inventaire-eqol.json` | 90,8 % d'accord avec ManuLemme (13 580 / 14 964) ; désaccords surtout de convention (g.e / ge, e[CC]) mais aussi de vraies erreurs (« ville », « mer ») |
| Audio Azure voix fr-BE Charline, depuis l'IPA | `traiter_liste.py` | 941 mots générés, 0 erreur ; écoute de JF : « bon partout » sur 18 mots pièges ; le reste non écouté |
| Paquet importable (mots.json, Excel Lilémo, audio, images, zip) + aperçu | `traiter_liste.py`, `apercu_paquet.py` | 9 mots ; 6 graphèmes identiques aux exemples de Lilémo ; aperçu testé à l'adresse locale |
| Images Canva sans fond | `images-recues\` | 9 images, 200 × 200 px, non relues par un humain |

## Lots
**Lot 1 — Contrat du paquet.** Schéma JSON versionné (`paquet-mots` 1.0), validateur, exemples. Tests : le validateur accepte le paquet d'exemple, refuse un paquet sans `statut`, refuse un mot « validé » sans audio. Sortie : un dépôt ou dossier `paquet-mots\` avec schéma, validateur, tests.

**Lot 2 — Correction du cœur de Lilémo avec les données de ManuLemme** (lot 1 de la spec) : ien, e de monosyllabe, geai, yod /j/, sept, ajoutés à `test-lilemo.js`. Le yod manque aux 36 sons : décision de JF (ajouter un son ou accepter un son par défaut). Test : `node test-lilemo.js`.

**Lot 3 — Import réel du paquet dans Lilémo** (version HTML actuelle) : charger `mots-lilemo.xlsx`, les images et l'audio, jouer 9 mots. Test à la main sur ordinateur et tablette ; ce test n'a jamais été fait.

**Lot 4 — Serveur de préparation** (`/api/preparer-liste.js`, Vercel). Reçoit des mots (jamais de donnée sur un élève), renvoie IPA, graphèmes, signalements ; appelle Azure côté serveur avec la clé en variable d'environnement ; cache audio par (mot, IPA, voix) ; limite de mots par appel et par enseignant ; test avec `vercel dev`, pas `vite dev`. Tests : mot absent, homographe sans sens, symbole IPA invalide, dépassement de limite.

**Lot 5 — Écran « Atelier »** (React) : import Excel côté navigateur, tableau des fiches, lecture audio, boutons valider / corriger l'IPA / écriture pour la voix, statuts. Chaque champ a un label, un exemple, une aide sur l'effet de la saisie. Police ≥ 16 px, charte PLAI, vérification à l'écran. Test : parcours complet d'un enseignant de l'Excel au paquet exporté.

**Lot 6 — Données.** Tables à préfixe `phono_` (par exemple `phono_mots`), RLS `auth.uid() = user_id`, `grant` dans la même migration, vérification des conflits par `grep` avant tout `create table`. **Aucune migration sans accord de JF.**

**Lot 7 — Images.** Version 1 : image fournie par l'enseignant (téléversement, taille limitée). Génération automatique : route à décider (le connecteur Canva ne fonctionne qu'en session), droits et coût [non vérifiés].

**Lot 8 — Banque partagée.** Après les autres : validations par enseignant d'abord, partage ensuite avec règle de confiance.

## Bloquants et décisions pour JF
1. **Licences non vérifiées :** ManuLemme, Eqol, conditions d'Azure pour redistribuer les audios, voix fr-BE Charline dans une app diffusée aux écoles. Sans cela, ne rien publier.
2. **Compte Azure :** celui du test est personnel (outlook), niveau gratuit, région North Europe (West Europe a refusé le compte). Un usage scolaire demande une décision sur le compte et le RGPD [non vérifié].
3. **Validation :** un mot n'est jamais « validé » sans écoute humaine ; qui valide, et la banque partagée ou non.
4. **Yod /j/ et sons manquants** de Lilémo (voir lot 2).
5. **Images :** route de génération hors session, ou fournies par l'enseignant.
6. **Nom et forme finale** (spec, point 2).

## Ce que ce plan ne prouve pas
Aucun enfant n'a utilisé ces mots ; aucune efficacité pédagogique n'est démontrée. Le test avec quelques élèves et un pré/post-test reste à prévoir avant d'affirmer un bénéfice.
