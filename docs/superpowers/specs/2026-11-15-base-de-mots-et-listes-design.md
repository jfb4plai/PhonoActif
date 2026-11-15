# Base de mots et listes de l'enseignant — spécification

Décidée par JF le 2026-11-15 (« je propose les 2 », option A puis chargeur par identifiant). Rien n'est construit au moment de l'écriture.

## Problème
Aujourd'hui une tâche = un pack (dossier `public/packs/<nom>/`) choisi dans une liste déroulante. L'enseignant ne peut pas choisir ses mots ; les 20 mots communs à deux packs sont dupliqués ; les fichiers audio sont copiés d'un pack à l'autre.

## Décisions de JF
1. **Deux temps** : (1) base de mots unique (option A), (2) listes composées par l'enseignant, chargées par identifiant de mot (option B).
2. **Une liste = 1 à 50 mots.**
3. **Plusieurs listes peuvent être chargées ensemble** dans une tâche, pour les révisions.
4. **Les liens déjà créés n'ont aucune importance** (jamais partagés hors de JF) : ils peuvent être supprimés ; pas de compatibilité à conserver.
5. L'enseignant compose sa liste ; l'IA ne choisit jamais les mots (règle du 2026-11-11). Seuls les mots **validés** sont proposés.
6. Interface **intuitive et flexible** : partir d'un modèle, ajuster, nommer, créer.

## Hypothèses (non données par JF — à confirmer)
- H1 : tous les mots des 6 packs publics sont « validés » (JF a rendu les 6 packs publics le 2026-11-15).
- H2 : une tâche qui charge plusieurs listes a au plus **200 mots** au total (borne technique, pas pédagogique) ; les doublons entre listes sont fusionnés, l'ordre des listes puis des mots est conservé.
- H3 : une liste appartient à **un enseignant** (réutilisable dans toutes ses classes), pas à une classe.
- H4 : la liste est **copiée dans la tâche** à sa création (instantané) : modifier ou supprimer la liste ensuite ne change pas les tâches déjà données.
- H5 : l'ordre des cartes est celui de la liste (pas de mélange en v1).

## Constat qui fonde le plan (fait le 2026-11-15, 156 mots, 6 packs publics)
- 20 mots sont dans deux packs (`p1-100` et `p1-20-images`). Pour 11 d'entre eux la seule différence est `syllabes` (présent dans `p1-20-images`, absent de `p1-100` pour les monosyllabes) ; les images, phrases, cubes, états et octets des audios sont identiques ; 9 sont strictement identiques.
- Aucune collision de nom de fichier audio avec des contenus différents : un nom de fichier = un contenu. Un fond audio commun est donc possible sans renommer.
- Règle de fusion retenue : la fiche **la plus complète** l'emporte (celle qui a `syllabes`).

## Architecture
- **Source unique** : `data/base/` (fiches.json, packs.json, assets/audio, assets/images), non servie.
- **Publication** : `public/mots/` (fiches.json, catalogue.json, audio/, images/), fabriquée par script, servie.
- **Compatibilité temporaire** : les packs `public/packs/<nom>/` sont recompilés depuis la base (preuve d'équivalence), puis retirés (tâche finale, sur GO de JF).
- **Listes** : table `phono_listes` (propriétaire, nom, mots[1..50]) ; la tâche stocke `mots text[]` (instantané) ; `phono_lire_tache` renvoie `mots`.
- **Élève** : `chargerMots(ids)` assemble un pack en mémoire à partir de `public/mots/fiches.json` ; `Jeu.jsx` lit les fichiers par `urlFichier(base, pack, fichier)`.

## Hors périmètre
Mélange des cartes, listes partagées entre enseignants, ajout de mots par l'enseignant sans l'auteur (reste la voie Excel + validation), mode « Écoute » sans lettres.
