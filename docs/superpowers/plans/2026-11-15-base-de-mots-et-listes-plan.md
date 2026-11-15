# Base de mots et listes de l'enseignant — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** remplacer « une tâche = un pack » par « une tâche = une ou plusieurs listes de 1 à 50 mots composées par l'enseignant », sur une base de mots unique.

**Architecture :** (1) une base `data/base/` fabrique `public/mots/` (fiches + fonds audio/images communs) et prouve qu'elle recompose les packs actuels ; (2) le jeu charge des mots par identifiant ; l'enseignant compose et sauvegarde des listes (Supabase), la tâche en garde un instantané.

**Tech Stack :** Node ESM (outils, `node --test`), React 18 + Vitest (`tests/**/*.test.jsx`), Supabase/PostgreSQL testé avec PGlite (`tests/sql`), Vite 5.

**Spec :** `docs/superpowers/specs/2026-11-15-base-de-mots-et-listes-design.md` (décisions de JF et hypothèses H1 à H5 à confirmer).

## Global Constraints
- Une liste = **1 à 50 mots** ; hypothèse H2 : une tâche = au plus **200 mots** après fusion.
- Niveaux FWB : M1-M3, P1-P6 ; jamais « CP », « CE1 »…
- Tables Supabase préfixées `phono_` ; `GRANT` explicites dans la même migration ; RLS `auth.uid() = created_by` ; aucune clé côté frontend.
- Texte d'interface en français, police Arial, 16 px minimum ; chaque champ : label, placeholder concret, aide sous le champ.
- L'IA ne choisit jamais les mots ; seuls les mots `statut: "valide"` sont proposés à l'enseignant.
- Aucune adresse e-mail en clair dans un fichier public.
- **Pas de commit ni de push sans demande explicite de JF** (« commite », « pousse » sont deux demandes). Chaque tâche se termine par un point de contrôle : tests verts + entrée au journal du logigramme (`tools/logigramme_interactif.py`, puis `python -I tools/logigramme_interactif.py`).
- **Aucune migration SQL n'est appliquée à la base partagée sans l'accord de JF** ; la suppression des anciennes tâches (décision 4) est dans la migration, appliquée sur son GO.
- Commandes : `npm test` (Node), `npm run test:ui` (Vitest), `npm run test:sql` (PGlite), `npx vite build` avant tout push.

## Review Focus
- Liste vide ou de 51 mots : refusée avec un message en français (interface **et** base).
- Mot en double dans une liste, ou dans deux listes d'une révision : fusionné, ordre conservé.
- Identifiant de mot retiré de la base après la création d'une tâche : la carte est sautée avec un avertissement, le jeu ne plante pas.
- Un enseignant ne voit ni ne modifie les listes d'un autre (RLS).
- Réseau coupé ou `fiches.json` illisible sur tablette : message français « Les mots n'ont pas pu être chargés », jamais un écran blanc.
- Nom de liste vide, de 61 caractères, ou avec accents/apostrophes : refusé / accepté tel quel.

---

### Task 1: Amorcer la base depuis les packs publics

**Files:**
- Create: `tools/base/amorcer.js`, `tests/tools/base-amorcer.test.js`
- Produces (données) : `data/base/fiches.json`, `data/base/packs.json`, `data/base/assets/audio/*.mp3`, `data/base/assets/images/*.png`

**Interfaces:**
- Produces : `fusionnerCartes(cartesDuMemeMot: Carte[]) -> Fiche` ; `amorcer({ racine, ecrire = true }) -> { fiches: Fiche[], packs: PackListe[], conflits: string[] }`.
- `Fiche` = carte du manifeste + `{ statut: "valide", origine: string[] }` ; `PackListe` = `{ id, titre, visibilite, mots: string[] }`.

- [ ] **Step 1: test** `fusionnerCartes` : deux cartes « chat » identiques sauf `syllabes` → la fiche garde `syllabes` ; deux cartes dont `phrase` diffère → `conflits` contient `"chat : phrase"` ; `origine` liste les packs.
- [ ] **Step 2: test** `amorcer` sur les vrais packs : 156 fiches, 6 packs, `conflits` vide, `packs.json` : `p1-100` a 100 identifiants, aucun doublon d'identifiant, chaque fichier cité par une fiche existe dans `assets/`.
- [ ] **Step 3: implémenter** en lisant `public/packs/index.json` et chaque `manifest.json` ; la fiche la plus complète l'emporte (celle qui a `syllabes`) ; fichiers copiés vers `data/base/assets/` sans le préfixe de pack (nom de fichier unique, collision de contenu différent → conflit).
- [ ] **Step 4: lancer** `node tools/base/amorcer.js` puis `node --test tests/tools/base-amorcer.test.js` → attendu : tous verts, 156 fiches.
- [ ] **Step 5: point de contrôle** (tests + logigramme).

### Task 2: Recompiler les packs depuis la base (preuve d'équivalence)

**Files:**
- Create: `tools/base/compiler.js`, `tests/tools/base-compiler.test.js`

**Interfaces:**
- Consumes : `data/base/*` (Task 1).
- Produces : `compilerPack({ racine, idPack, sortie }) -> { manifest, fichiers: string[] }` ; écrit `sortie/manifest.json` et copie les fichiers cités.

- [ ] **Step 1: test** : pour chacun des 6 packs, le manifeste compilé est égal (deep equal) à `public/packs/<id>/manifest.json`, sauf `syllabes` des 11 mots communs (liste exacte dans le test) ; chaque fichier cité existe dans la sortie et a les **mêmes octets** que dans `public/packs/<id>/`.
- [ ] **Step 2: implémenter** `compilerPack` (ordre des cartes = ordre de `packs.json`, `nom`/`mode`/`titre`/`visibilite`/`source` repris du manifeste d'origine conservé dans `packs.json`).
- [ ] **Step 3: lancer** `node --test tests/tools/base-compiler.test.js` → attendu : 6 packs équivalents.
- [ ] **Step 4: point de contrôle.**

### Task 3: Publier la base servie (`public/mots/`)

**Files:**
- Create: `tools/base/publier.js`, `tests/tools/base-publier.test.js`
- Produces (données) : `public/mots/fiches.json`, `public/mots/catalogue.json`, `public/mots/audio/*`, `public/mots/images/*`, `public/mots/modeles.json`

**Interfaces:**
- Produces : `publier({ racine }) -> { nbMots, octets }`.
- `catalogue.json` : `[{ id, mot, ipa, nbSyllabes, cubes: string[], sons: string[], image: boolean, phrase: boolean, syllabes: boolean, packs: string[] }]` (champs pour filtrer et afficher les pastilles ; sans chemins de fichiers).
- `modeles.json` : `[{ id, titre, mots: string[] }]` (les packs actuels vus comme listes modèles ; seuls les `statut: "valide"` entrent).

- [ ] **Step 1: test** : `catalogue.json` a 156 entrées triées par mot ; `fiches.json` pèse moins de 600 Ko ; tout fichier cité par une fiche existe sous `public/mots/` ; `modeles.json` contient `p1-100` avec 100 mots.
- [ ] **Step 2: implémenter** ; les chemins d'une fiche restent relatifs (`audio/64_0.mp3`, `images/chat.png`) pour que `urlFichier` les résolve sous `mots/`.
- [ ] **Step 3: lancer** `node tools/base/publier.js` puis les tests → attendu verts.
- [ ] **Step 4: point de contrôle.**

### Task 4: Règles des listes (fonctions pures)

**Files:**
- Create: `src/core/liste.js` (+ export dans `src/core/index.js`), `tests/core/liste.test.js`

**Interfaces:**
- Produces : `LISTE_MIN = 1`, `LISTE_MAX = 50`, `TACHE_MAX = 200` ;
  `validerListe(ids: string[], catalogueIds: Set<string>) -> { erreurs: string[], mots: string[] }` ;
  `fusionnerListes(listes: string[][]) -> string[]` (dédoublonne, garde l'ordre) ;
  `validerTache(ids: string[]) -> { erreurs: string[] }` (1 à `TACHE_MAX`).

- [ ] **Step 1: tests** : 0 mot → erreur « Une liste contient au moins 1 mot. » ; 51 mots → « Une liste contient au plus 50 mots. » ; identifiant inconnu → « Mot inconnu : x. » ; doublons supprimés ; `fusionnerListes([["a","b"],["b","c"]])` = `["a","b","c"]` ; fusion de 4 listes de 50 distincts = 200 valide, 201 refusé par `validerTache`.
- [ ] **Step 2: implémenter**, **Step 3: lancer** `node --test tests/core/liste.test.js` → verts.
- [ ] **Step 4: point de contrôle.**

### Task 5: Chargeur par identifiant et adresse des fichiers

**Files:**
- Create: `src/app/chargerMots.js`, `src/app/urlFichier.js`, `tests/app/chargerMots.test.js`
- Modify: `src/app/Jeu.jsx` (5 endroits qui construisent `${base}packs/${…}/…` : lignes 45, 52, 62, 68, 105)

**Interfaces:**
- Produces : `chargerMots(ids: string[], { base = '/', fetch }) -> Promise<{ pack, avertissements: string[] }>` avec `pack = { nom: 'liste', racine: 'mots', mode: 'lettres', cartes }` ; erreur française « Les mots n'ont pas pu être chargés. » si le réseau échoue ; un identifiant absent de `fiches.json` est sauté avec l'avertissement « Mot retiré de la base : x ».
- `urlFichier(base: string, pack: { racine?: string, dossier?: string, nom: string }, fichier: string) -> string` : `${base}${pack.racine}/…` si `racine`, sinon `${base}packs/${dossier||nom}/…` (compatibilité tant que `packs/` existe).

- [ ] **Step 1: tests** (fetch simulé) : 3 identifiants → 3 cartes dans l'ordre ; identifiant inconnu → avertissement, 2 cartes ; `fetch` qui rejette → message français ; `urlFichier` des deux formes, avec `encodeURIComponent` par segment.
- [ ] **Step 2: implémenter** ; **Step 3: remplacer** les 5 constructions d'URL de `Jeu.jsx` par `urlFichier` ; **Step 4: lancer** `node --test tests/app/chargerMots.test.js` puis `npm run test:ui` → verts (les tests existants de `Jeu` doivent passer sans changement).
- [ ] **Step 5: point de contrôle.**

### Task 6: Migration SQL des listes et des tâches (écrite, non appliquée)

**Files:**
- Create: `supabase/migrations/20261115000000_phono_listes.sql`, `tests/sql/listes.test.js`

**Interfaces:**
- Produces : table `phono_listes(id uuid pk, created_by uuid → auth.users, name text 1..60, words text[] avec cardinality 1..50 et chaque élément ~ '^[a-z0-9-]{1,60}$', created_at, updated_at)` ; `phono_tasks.mots text[] not null default '{}'` (cardinality ≤ 200) et `phono_tasks.listes_noms text` ; `phono_lire_tache(p_token)` renvoie en plus `'mots'`.

- [ ] **Step 1: tests PGlite** : un enseignant crée une liste de 1 et de 50 mots ; 0 et 51 refusés par la base ; élément `"A b"` refusé ; un autre utilisateur ne la voit pas et ne peut ni la modifier ni la supprimer ; `phono_lire_tache` renvoie `mots` ; `anon` n'a aucun accès à `phono_listes` ; grants présents.
- [ ] **Step 2: écrire la migration** (create table + RLS + grants `authenticated` + colonnes + `create or replace function phono_lire_tache`). Reprendre le corps de `20261114020000_phono_vitesse.sql` en ajoutant `'mots'`.
- [ ] **Step 3: décision 4** : ajouter en tête `delete from public.phono_tasks;` (supprime les anciennes tâches et, par cascade, leurs essais de test) — la ligne porte le commentaire « décision de JF 2026-11-15 : liens jamais partagés ».
- [ ] **Step 4: lancer** `npm run test:sql` → tous verts, migration marquée NON APPLIQUÉE dans l'en-tête, en attendant l'accord de JF.
- [ ] **Step 5: point de contrôle.**

### Task 7: Accès aux listes et création de tâche à partir de listes

**Files:**
- Create: `src/enseignant/listes.js`, `tests/enseignant/listes.test.js`
- Modify: `src/enseignant/api.js` (`creerTache`, `listerTaches`), `src/sync/envoi.js` (lecture de `mots`), `src/app/route.js` (champ `mots` de la tâche lue par jeton)

**Interfaces:**
- Consumes : `validerListe`, `fusionnerListes`, `validerTache` (Task 4).
- Produces : `listerListes(client, userId) -> Liste[]` ; `enregistrerListe(client, userId, { id?, nom, mots }) -> Liste` ; `dupliquerListe(client, userId, liste) -> Liste` (nom « … (copie) ») ; `supprimerListe(client, id) -> void` ;
  `creerTache(client, classId, tache, userId, base)` accepte `tache.mots: string[]` et `tache.listesNoms: string` (écrit `mots`, `listes_noms`, et `pack` = noms joints tronqués à 60) ; `listerTaches` renvoie `mots`, `listesNoms`.

- [ ] **Step 1: tests** (client Supabase simulé) : `enregistrerListe` refuse 0 mot et 51 mots avant tout appel réseau ; `creerTache` avec deux listes écrit les mots fusionnés sans doublon ; 201 mots refusé ; `listerTaches` lit `mots`.
- [ ] **Step 2: implémenter** ; **Step 3: lancer** `node --test tests/enseignant/listes.test.js` et `npm run test:ui` → verts.
- [ ] **Step 4: point de contrôle.**

### Task 8: Interface enseignant — composer et choisir des listes

**Files:**
- Create: `src/enseignant/ListeEditeur.jsx`, `src/enseignant/Catalogue.jsx`, `tests/enseignant/ListeEditeur.test.jsx`
- Modify: `src/enseignant/Classe.jsx` (remplacer le `<select id="ens-pack">` lignes 93-95 par le choix de listes), `src/enseignant/enseignant.css`, `src/app/Pages.jsx` (étape 4 du mode d'emploi)

**Interfaces:**
- Consumes : `catalogue.json`, `modeles.json` (Task 3), `listes.js` (Task 7), `liste.js` (Task 4).
- Produces : `<Catalogue mots onChoisir />` (tableau filtrable : recherche texte, son, nombre de syllabes, avec/sans image ; pastilles image/phrase/syllabes ; bouton « Écouter » par mot qui joue `public/mots/audio/…`) ; `<ListeEditeur client userId liste onFini />` (nom, mots choisis réordonnables, compteur « n / 50 », partir d'un modèle ou d'une liste vide, Enregistrer) ; dans `Classe.jsx` : cases « Mes listes » et « Modèles » (plusieurs cochables = révision), total affiché « n mots (maximum 200) », bouton « Créer la tâche et les liens des élèves ».

- [ ] **Step 1: tests (Testing Library)** : le compteur affiche « 50 / 50 » et bloque l'ajout du 51e avec « Une liste contient au plus 50 mots. » ; partir du modèle « 100 mots de P1 » propose de **retirer** pour tomber à 50 (message « Retirez 50 mots pour enregistrer ») ; cocher 2 listes affiche le total fusionné ; le bouton de création est désactivé à 0 mot et au-delà de 200 ; chaque champ a label, placeholder et aide.
- [ ] **Step 2: implémenter** les trois composants ; texte d'aide du nom : « Ce nom n'apparaît que pour vous, ex. : Semaine 3, mots en an ». Mettre à jour le mode d'emploi (étape 4) : une tâche = une ou plusieurs listes + réglages.
- [ ] **Step 3: lancer** `npm run test:ui` → verts ; `npx vite build` sans erreur.
- [ ] **Step 4: point de contrôle** ; essai dans le navigateur (`vercel dev` n'est pas nécessaire : pas d'API serveur) sur un compte de test, 375 px de large inclus.

### Task 9: Côté élève — jouer une tâche à listes

**Files:**
- Modify: `src/app/App.jsx` (lignes ~102 et ~162 : si `tache.mots` non vide → `chargerMots`, sinon `chargerPack`), `tests/app/` (test de bout en bout avec `fetch` simulé)

**Interfaces:**
- Consumes : `chargerMots` (Task 5), `phono_lire_tache` → `mots` (Task 6/7).

- [ ] **Step 1: test** : un lien `#/jeu?t=<jeton>` dont la tâche renvoie `mots: ["chat","lune","terre"]` charge 3 cartes dans l'ordre, joue le premier mot avec l'URL `mots/audio/…`, affiche « Carte 1 sur 3 » ; un identifiant retiré donne l'avertissement sans plantage.
- [ ] **Step 2: implémenter** ; **Step 3: lancer** `npm run test:ui` → verts ; **Step 4: essai manuel** sur le jeu en `file://` n'est pas applicable (app à base `/`) : tester `npx vite preview` à l'adresse locale et à l'URL publique après déploiement.
- [ ] **Step 5: point de contrôle.**

### Task 10: Retirer les anciens packs et l'ancien chargeur (sur GO de JF)

**Files:**
- Delete : `public/packs/<nom>/` (6 packs), `src/app/chargerPack.js` et ses usages ; Modify : `public/packs/index.json` → retiré, `Accueil.jsx` (liste de packs → liste de modèles), `docs/fabriquer-un-pack.md`, `docs/liste-des-mots` (régénérée)

- [ ] **Step 1: préconditions** : migration appliquée (accord de JF) **avant tout push du code**, Tasks 1-9 verts, essai sur le site déployé d'une tâche à 2 listes. Demander le GO de JF avant d'effacer.
- [ ] **Step 2: supprimer**, mettre à jour l'accueil élève et les liens rapides (`#/jeu?pack=` devient `#/jeu?modele=`) ; **Step 3: lancer** tous les tests (`npm test`, `npm run test:ui`, `npm run test:sql`) et `npx vite build`.
- [ ] **Step 4: point de contrôle** ; mettre à jour `portail-plai/src/data/apps.ts` seulement si la vignette décrit « packs ».
