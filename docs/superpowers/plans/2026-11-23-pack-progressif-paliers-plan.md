# Pack progressif P1 : paliers ordonnés (B3) et commandes de fin de palier pour l'adulte (B3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un pack de 93 mots en 18 paliers de difficulté croissante (1 à 5, 6a à 6f, 7 à 12, F) que l'élève joue dans l'ordre ; à la fin de chaque palier, l'adulte voit la difficulté suivante et choisit d'arrêter, de continuer ou de passer le palier, sous le bouton « Vitesse de la voix ».

**Architecture:** Un modèle publié (`modeles.json`) porte en plus de `mots` une liste `paliers`. Les limites de palier se recalculent au démarrage du jeu à partir des identifiants chargés (`paliersPourMots`), donc un lien rapide et une tâche d'enseignant se comportent pareil. Le moteur (`session.js`) reste pur ; la pause de fin de palier est un état de `Jeu.jsx` qui appelle trois fonctions pures de `src/jeu/paliers.js`. Aucune décision n'est prise par l'app : l'élève voit un message neutre, seul l'adulte choisit.

**Tech Stack:** React 18, Vite 5, Vitest (tests/app, tests/jeu) et `node:test` (tests/core, tests/tools), `npm test`, `npx vite build`.

**Spec:** `docs/plan-apport-virginie-pack-progressif.md` (sections 3 à 6, B3), `docs/plan-ajouts-pack-progressif.md` (décisions du 2026-11-22), source des mots `data/pack-progressif/paliers-p1.json`. Pas de spec séparée : les décisions de JF sont reprises dans Global Constraints.

## Global Constraints

- Publication : le pack n'est publié qu'**avec ses 93 mots valides** (12 paliers + palier final F : 65 + 20 + 8). Aucun pack partiel dans `modeles.json` (décision de JF du 2026-11-22).
- Aucune décision automatique sur l'élève : le passage, le saut et l'arrêt d'un palier sont toujours le choix de l'adulte. L'élève voit un message neutre (décision de JF du 2026-11-22).
- Les commandes de palier sont **sous le bouton de réglage de la voix** (zone `.reglage-adulte` de `Jeu.jsx`), qui s'ouvre seul à la fin d'un palier (décision de JF du 2026-11-22).
- Textes en français ; niveaux M1-M3 et P1-P6 uniquement ; consignes pour l'élève à l'infinitif, une action par phrase.
- Accessibilité : police 16 px minimum, cibles tactiles 44 px minimum, `aria-live` pour le message de pause, focus sur le premier bouton de l'adulte.
- Ne pas modifier `src/app/route.js`, `src/core/index.js`, `src/app/jeu.css` ni `tests/app/mode-a.test.jsx` : une autre session (mode maternelle « initiale », guidage) les modifie. Importer `src/core/paliers.js` directement, mettre le CSS dans `src/app/palier.css`, mettre les tests dans de nouveaux fichiers.
- Commits : uniquement les fichiers du chantier, jamais `git add .` ; `npx vite build` et `npm test` verts avant tout push sur `main`.
- Les 18 textes d'annonce (task 2) sont écrits pour l'adulte, sans jargon (pas de « CVC », pas de « décision 5 ») : JF les valide avant la publication.

## Review Focus

- Une liste dont les mots ne forment pas au moins 2 groupes de palier, ou dont l'ordre ne suit pas celui du modèle : jeu normal, aucune pause, aucune commande de palier (task 1 et task 5).
- Mot retiré de la base (avertissement « Mot retiré de la base ») : les groupes se calculent sur les cartes réellement chargées, jamais sur la liste demandée (task 5).
- Dernier palier terminé, ou saut du dernier palier annoncé : fin normale vers le bilan, sans erreur, avec mention du saut (task 3 et task 6).
- Commandes épurées (`commandes=epure`) ou voix verrouillée (`vitesseVerrou`) : la zone de l'adulte doit rester atteignable à la fin d'un palier (task 4).
- L'élève appuie sur « Suivant », « Écouter » ou une pièce pendant la pause : rien n'avance (task 4).
- « Rejouer » depuis le bilan : repart au palier 1 avec l'état réinitialisé (task 6).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/core/paliers.js` (créer) | Calcul pur des limites de palier à partir des identifiants et des modèles |
| `src/jeu/paliers.js` (créer) | Trois transitions pures de fin de palier : continuer, passer, arrêter |
| `src/jeu/session.js` (modifier) | Exporter `allerACarte(etat, index)` ; `suivant` l'utilise |
| `tools/base/ajouter_pack_progressif.js` (créer) | Écrit l'entrée du pack dans `data/base/packs.json` à partir de `data/pack-progressif/paliers-p1.json` |
| `data/pack-progressif/paliers-p1.json` (modifier) | Ajouter le champ `annonce` à chaque palier |
| `tools/base/publier.js` (modifier) | Copier `paliers` dans `modeles.json` ; ne publier un modèle à paliers que s'il est complet |
| `src/app/PausePalier.jsx` (créer) | Panneau de l'adulte (annonce + 3 boutons) et message neutre de l'élève |
| `src/app/palier.css` (créer) | Styles de la pause et du panneau |
| `src/app/Jeu.jsx` (modifier) | Détecter la fin de palier, ouvrir le panneau, bloquer les commandes de l'élève |
| `src/app/App.jsx`, `src/app/Bilan.jsx` (modifier) | Calculer `pack.paliers` au démarrage ; afficher arrêt et sauts au bilan |

---

### Task 1: Limites de palier (fonctions pures)

**Files:**
- Create: `src/core/paliers.js`
- Test: `tests/core/paliers.test.js`

**Interfaces:**
- Produces:
  - `type Palier = { id: string, difficulte: string, annonce: string, ids: string[], debut: number, fin: number }` (`debut` et `fin` : indices inclus dans la liste de cartes)
  - `paliersPourMots(ids: string[], modeles: Array<{ id: string, mots: string[], paliers?: Array<{ id: string, difficulte: string, annonce?: string, mots: string[] }> }>): Palier[] | null`
  - `numeroDePalier(paliers: Palier[], index: number): number` (position du palier dans `paliers`)
  - `estFinDePalier(paliers: Palier[] | null, index: number): boolean` (vrai si la carte est la dernière de son palier et qu'un palier suit)

- [ ] **Step 1: Write the failing tests** in `tests/core/paliers.test.js` (`node:test`)
  - `paliersPourMots` avec un modèle `{ id: 'pp', mots: ['a','b','c','d','e'], paliers: [{ id: '1', difficulte: 'x', mots: ['a','b'] }, { id: '2', difficulte: 'y', mots: ['c','d','e'] }] }` et `ids = ['a','b','c','d','e']` : deux paliers, `debut/fin` = `0/1` et `2/4`.
  - Liste partielle `['a','b','c']` : palier 2 = `{ ids: ['c'], debut: 2, fin: 2 }`.
  - Un seul palier non vide (`['a','b']`) : renvoie `null`.
  - Ordre contraire au modèle (`['c','a','b']`) : renvoie `null`.
  - Aucun modèle à paliers : renvoie `null`.
  - `estFinDePalier(paliers, 1)` vrai ; `estFinDePalier(paliers, 4)` faux (dernier palier) ; `estFinDePalier(null, 0)` faux.
- [ ] **Step 2: Run** `node --test tests/core/paliers.test.js` : FAIL (module introuvable).
- [ ] **Step 3: Implement** `paliersPourMots` : pour chaque modèle ayant `paliers`, garder dans chaque palier les identifiants présents dans `ids`, retenir le premier modèle dont les groupes non vides sont au moins 2 et dont les positions croissent dans `ids` ; sinon `null`. `annonce` vaut `''` si absente.
- [ ] **Step 4: Run** `node --test tests/core/paliers.test.js` : PASS.
- [ ] **Step 5: Commit** `git add src/core/paliers.js tests/core/paliers.test.js` puis `git commit -m "feat: limites de palier du pack progressif (fonctions pures)"`.

---

### Task 2: Données du pack et publication complète seulement

**Files:**
- Modify: `data/pack-progressif/paliers-p1.json` (champ `annonce` par palier)
- Create: `tools/base/ajouter_pack_progressif.js`
- Modify: `tools/base/publier.js` (ligne `const modeles = …`)
- Test: `tests/tools/base-publier.test.js` (ajouter des cas), `tests/tools/pack-progressif.test.js` (créer)

**Interfaces:**
- Consumes: `data/pack-progressif/paliers-p1.json` : `{ paliers: [{ id, difficulte, mots[] }] }`.
- Produces: entrée de `data/base/packs.json` `{ id: 'pack-progressif-p1', entree: { id, label }, manifeste: { nom, mode: 'lettres', titre, paliers: [{ id, difficulte, annonce, mots }], source }, mots: string[] }` ; dans `public/mots/modeles.json` : `{ id, titre, mots, paliers }`.

- [ ] **Step 1: Write the failing tests**
  - `tests/tools/pack-progressif.test.js` : `data/pack-progressif/paliers-p1.json` a 18 paliers (ids `1,2,3,4,5,6a,6b,6c,6d,6e,6f,7,8,9,10,11,12,F`), 93 mots distincts, chaque palier a un `annonce` non vide, aucune `annonce` ne contient « CVC » ni « décision ».
  - `tests/tools/base-publier.test.js` : modèle à paliers dont tous les mots sont valides : présent dans `modeles.json` avec `paliers` ; même modèle avec un mot au statut `brouillon` : **absent** de `modeles.json` ; un modèle sans `paliers` est inchangé (`mots` filtrés comme avant).
- [ ] **Step 2: Run** `node --test tests/tools/pack-progressif.test.js tests/tools/base-publier.test.js` : FAIL.
- [ ] **Step 3: Write the 18 `annonce`** (texte proposé, à valider par JF), toutes de la forme « Palier suivant : … » :

| Palier | Annonce proposée |
|---|---|
| 1 | Mots de départ : lettres simples, consonnes longues (f, m, l, s, n, r, v, j, z). |
| 2 | Arrivée des consonnes courtes (p, t, d, b…). |
| 3 | Mots terminés par un e muet (rue, vie…). |
| 4 | Mots qui se terminent par une consonne (fil, mur…). |
| 5 | Lettres muettes à la fin du mot (lit, nid, riz…). |
| 6a à 6f | Le son « ou » ; le son « on » ; le son « an » ; le son « in » ; le son « oi » ; le son « eu ». |
| 7 | Sons écrits avec trois lettres : eau, ain, ein, eil, aim. |
| 8 | Le son « ch » (chou, cochon, chien). |
| 9 | Mots terminés par « et » ou « ez » (jet, nez, jouet…). |
| 10 | Lettres qui changent de son : c qui se lit s, o fermé (ciné, zéro, moto). |
| 11 | Deux consonnes de suite (livre, film, clé). |
| 12 | Mots de trois syllabes (mimosa, salami…). |
| F | Palier final, le plus difficile : e et a dans le même mot (café, salade, tomate…). |

- [ ] **Step 4: Implement** `tools/base/ajouter_pack_progressif.js` : lit `paliers-p1.json`, remplace ou ajoute l'entrée `pack-progressif-p1` de `data/base/packs.json` (`mots` = concaténation des paliers dans l'ordre, titre « Pack progressif P1 (93 mots, 12 paliers et palier final) »). Modifier `publier.js` : `paliers` copiés avec leurs `mots` filtrés sur les fiches valides ; si un palier perd un mot, le modèle entier n'est pas écrit dans `modeles.json`.
- [ ] **Step 5: Run** `node tools/base/ajouter_pack_progressif.js && node tools/base/publier.js` : « 259 mots publiés » ; `public/mots/modeles.json` contient `pack-progressif-p1` avec 93 mots et 18 paliers. Puis `node --test tests/tools/pack-progressif.test.js tests/tools/base-publier.test.js` : PASS.
- [ ] **Step 6: Commit** les fichiers ci-dessus, `data/base/packs.json` et `public/mots/modeles.json` (le pack n'est pas encore jouable avec pause : l'app l'ignore tant que les tasks 4 à 6 ne sont pas faites ; il se joue comme une liste ordinaire).

---

### Task 3: Transitions de fin de palier (moteur pur)

**Files:**
- Modify: `src/jeu/session.js` (`suivant`, ligne ~125)
- Create: `src/jeu/paliers.js`
- Test: `tests/jeu/paliers.test.js` (`vitest`)

**Interfaces:**
- Consumes: `Palier` et `estFinDePalier` de la task 1 ; `Etat` de `session.js`.
- Produces:
  - `allerACarte(etat: Etat, index: number): Etat` (exporté de `session.js` ; remet pièces, tentatives, aide, plateau à zéro comme `suivant`)
  - `continuerPalier(etat: Etat, paliers: Palier[]): Etat` = carte suivante
  - `passerPalier(etat: Etat, paliers: Palier[]): Etat` = première carte du palier d'après le suivant ; `statut: 'fini'` s'il n'existe pas ; ajoute l'identifiant du palier sauté à `etat.paliersSautes: string[]`
  - `arreterApresPalier(etat: Etat, paliers: Palier[]): Etat` = `statut: 'fini'`, `etat.arret = { apres: string }` (identifiant du palier terminé)

- [ ] **Step 1: Write the failing tests** (`demarrerJeu` sur un pack de 5 cartes, paliers `[0-1]`, `[2-3]`, `[4]`, avancés jusqu'à la carte d'indice 1 en statut `juste`)
  - `continuerPalier` : `index === 2`, `statut === 'en_cours'`, `poses` vide.
  - `passerPalier` : `index === 4`, `paliersSautes` égal à `['<id du palier 2>']`.
  - Depuis l'indice 3 (fin du palier 2) : `passerPalier` renvoie `statut === 'fini'` et `paliersSautes` contient l'id du palier 3.
  - `arreterApresPalier` : `statut === 'fini'`, `arret.apres` égal à l'id du palier 1, `index` inchangé.
  - Une transition appelée alors que la carte n'est pas finie (`statut === 'en_cours'`) renvoie l'état sans changement.
- [ ] **Step 2: Run** `npx vitest run tests/jeu/paliers.test.js` : FAIL.
- [ ] **Step 3: Implement** : extraire de `suivant` la construction du plateau dans `allerACarte` (le comportement de `suivant` ne change pas : `tests/jeu/session.test.js` reste vert), puis les trois fonctions.
- [ ] **Step 4: Run** `npx vitest run tests/jeu` : PASS.
- [ ] **Step 5: Commit** `git add src/jeu/session.js src/jeu/paliers.js tests/jeu/paliers.test.js`, message `feat: transitions de fin de palier`.

---

### Task 4: Pause de fin de palier et panneau de l'adulte

**Files:**
- Create: `src/app/PausePalier.jsx`, `src/app/palier.css`
- Modify: `src/app/Jeu.jsx` (`surSuivant` ligne ~157 ; zone `.reglage-adulte` en fin de fichier)
- Test: `tests/app/palier.test.jsx` (`vitest`, `<Jeu>` rendu directement avec un pack « lettres » de 5 cartes et `pack.paliers` en 3 paliers 0-1, 2-3, 4 : ce test ne dépend pas de la task 5)

**Interfaces:**
- Consumes: `pack.paliers: Palier[] | null` (task 5) ; `estFinDePalier`, `numeroDePalier` (task 1) ; `continuerPalier`, `passerPalier`, `arreterApresPalier` (task 3).
- Produces: `PausePalier({ palierTermine: Palier, palierSuivant: Palier, existeApres: boolean, onContinuer: () => void, onPasser: () => void, onArreter: () => void })` (panneau de l'adulte) ; `<MessageEleve />` (message neutre, sans props).

Comportement exact (à tester) :
  - Fin de palier = carte `juste` ou `revelation` ET `estFinDePalier(paliers, etat.index)` : au clic sur « Suivant », l'état passe en pause au lieu d'avancer.
  - En pause, l'élève voit « On fait une pause. » (`role="status"`) et **aucune** commande : « Écouter », « Vérifier », « Suivant », « Retirer », « Tout effacer », « Besoin d'aide ? » et les pièces sont absents ou `disabled`.
  - Le panneau de l'adulte s'ouvre seul (`vitesseOuverte` vaut vrai), sous le bouton « Vitesse de la voix : … », et montre : « Palier terminé. », l'annonce du palier suivant et trois boutons « Arrêter ici », « Continuer avec le palier suivant », « Passer le palier suivant » (ce dernier absent s'il n'y a pas de palier après le suivant). Le focus va sur « Continuer avec le palier suivant ».
  - Avec `commandes=epure` ou `vitesseVerrou`, la zone de l'adulte est rendue pendant la pause (le verrou ne cache que les boutons de vitesse) ; hors pause elle reste comme avant (absente en épuré ou verrouillé).

- [ ] **Step 1: Write the failing tests** dans `tests/app/palier.test.jsx`
  - cartes 0 et 1 jouées (palier 1) : après « Suivant » sur la carte 1, `screen.getByText('On fait une pause.')` ; `queryByRole('button', { name: 'Vérifier' })` est nul ou désactivé ; `getByRole('button', { name: 'Continuer avec le palier suivant' })` présent et focalisé ; le texte d'annonce du palier 2 est affiché.
  - « Continuer … » : la carte 3 s'affiche, la pause disparaît.
  - « Passer le palier suivant » : avec 3 paliers, la carte du palier 3 s'affiche ; avec 2 paliers, le bouton est absent.
  - « Arrêter ici » : le bilan s'affiche (`getByText(/Arrêté après/)`).
  - Pendant la pause, cliquer sur une pièce du plateau ne change pas les cases.
  - Avec `commandes: 'epure'` et `vitesseVerrou: true`, la pause affiche quand même les trois boutons.
  - Pack sans `paliers` : « Suivant » avance comme avant, aucune pause (non-régression).
- [ ] **Step 2: Run** `npx vitest run tests/app/palier.test.jsx` : FAIL.
- [ ] **Step 3: Implement** `PausePalier.jsx` (boutons ≥ 44 px, texte ≥ 16 px, `aria-live="polite"` sur l'annonce) et `palier.css`, importé par `Jeu.jsx` ; dans `Jeu.jsx`, état `pause` (`null` ou `{ index }`), `surSuivant` qui l'active, rendu conditionnel des commandes de l'élève, et zone adulte rendue si `pause !== null || !(epure || tache.vitesseVerrou)` (boutons de vitesse inchangés).
- [ ] **Step 4: Run** `npx vitest run tests/app` : PASS (les tests existants restent verts).
- [ ] **Step 5: Commit** `git add src/app/PausePalier.jsx src/app/palier.css src/app/Jeu.jsx tests/app/palier.test.jsx`, message `feat: pause de fin de palier et commandes de l'adulte`.

---

### Task 5: Calcul des paliers au démarrage

**Files:**
- Modify: `src/app/App.jsx` (liste `packsListe` ligne ~90 et `commencer()` ligne ~158)
- Modify: `src/enseignant/Enseignant.jsx` seulement si les modèles perdent `paliers` en route (vérifier avec le test)
- Test: `tests/app/palier-demarrage.test.jsx`

**Interfaces:**
- Consumes: `paliersPourMots` (task 1) ; `modeles.json` avec `paliers` (task 2).
- Produces: `pack.paliers: Palier[] | null` passé à `Jeu` (tâche 4), calculé sur les **cartes chargées** (`charge.cartes.map(c => c.id)`).

- [ ] **Step 1: Write the failing tests** (mock de `fetch` pour `mots/modeles.json`, `mots/fiches.json`)
  - Lien rapide `#/jeu?pack=pack-progressif-p1` : `Jeu` reçoit 2 paliers ou plus (la pause apparaît à la fin du premier palier).
  - Tâche d'enseignant avec `mots` = liste aplatie des paliers 1 à 3 du modèle : paliers recalculés (3 groupes).
  - Un mot du modèle absent de `fiches.json` : les groupes sont calculés sur les cartes chargées, aucune erreur, avertissement « Mot retiré de la base » conservé.
  - Liste ordinaire (`p1-100`) : `pack.paliers` vaut `null`, aucune pause.
- [ ] **Step 2: Run** `npx vitest run tests/app/palier-demarrage.test.jsx` : FAIL.
- [ ] **Step 3: Implement** : conserver `paliers` dans l'objet des modèles de `packsListe` ; dans `commencer()`, après le chargement, `utilise = { ...charge, paliers: paliersPourMots(charge.cartes.map(c => c.id), packsListe) }` (y compris pour `carteUnique`, où le résultat est `null`).
- [ ] **Step 4: Run** `npx vitest run tests/app`, puis `npm test` : PASS.
- [ ] **Step 5: Commit** `git add src/app/App.jsx tests/app/palier-demarrage.test.jsx` (plus `Enseignant.jsx` si modifié), message `feat: paliers calculés au démarrage du jeu`.

---

### Task 6: Bilan et rejouer

**Files:**
- Modify: `src/app/App.jsx` (`onFin`), `src/app/Bilan.jsx`
- Test: `tests/app/palier-bilan.test.jsx`

**Interfaces:**
- Consumes: `etat.arret`, `etat.paliersSautes` (task 3).
- Produces: `Bilan({ …, arret?: { apres: string }, paliersSautes?: string[] })` ; `onFin(apres: Etat)` mémorise ces deux valeurs dans l'état de `App`.

- [ ] **Step 1: Write the failing tests**
  - Après « Arrêter ici » au palier 1 : le bilan contient « Arrêté après le palier 1 ».
  - Après « Passer le palier suivant » puis la fin du pack : le bilan contient « Palier 2 passé par l'adulte ».
  - Fin normale d'un pack à paliers : aucune de ces deux phrases.
  - « Rejouer » : le jeu repart à la carte 1 et la pause du palier 1 réapparaît à sa fin ; les mentions du bilan précédent ont disparu.
- [ ] **Step 2: Run** `npx vitest run tests/app/palier-bilan.test.jsx` : FAIL.
- [ ] **Step 3: Implement** l'affichage (texte adulte, sans promesse sur l'élève) ; réinitialiser les deux valeurs dans `onRejouer`.
- [ ] **Step 4: Run** `npm test` : PASS ; `npx vite build` : sans erreur.
- [ ] **Step 5: Commit** `git add src/app/App.jsx src/app/Bilan.jsx tests/app/palier-bilan.test.jsx`, message `feat: bilan du pack à paliers (arrêt et sauts)`.

---

### Task 7: Parcours réel et mise en ligne

**Files:**
- Modify: `tools/logigramme_interactif.py` (journal), `docs/mots-par-pack-v2.xlsx` (inchangé : mots identiques)

- [ ] **Step 1: Parcours en local** : `npx vite build` puis `npx vite preview` ; ouvrir `#/jeu?pack=pack-progressif-p1` dans le navigateur du volet, jouer les 9 mots du palier 1 en commandes complètes, vérifier la pause, l'ouverture automatique du panneau, les trois boutons ; refaire avec `&commandes=epure` et `&verrou=1`. Noter chaque résultat constaté (étapes + ce qui s'affiche) ; ce qui n'a pas été exercé est écrit « non vérifié ».
- [ ] **Step 2: Contrôle du pack** : `python -I -X utf8 tools/pack_progressif_controle.py` signale uniquement `livre, lièvre, film, clé` (palier 11) ; `node --test tests/tools` PASS.
- [ ] **Step 3: Mise en ligne** (autorisation durable de pousser : build et tests verts) : commit des fichiers du chantier, `git push origin main`, puis vérifier `https://phonoactif.vercel.app/mots/modeles.json` : `pack-progressif-p1` avec 93 mots et 18 paliers, et l'adresse `https://phonoactif.vercel.app/#/jeu?pack=pack-progressif-p1` joue le premier mot.
- [ ] **Step 4: Journal** : entrée dans `tools/logigramme_interactif.py`, régénération des deux logigrammes, commit.

---

## Décisions à confirmer par JF avant de commencer

1. **Sens de « passer ce palier »** : le palier **annoncé** (le suivant) est sauté ; l'élève reprend au palier d'après. Sinon : sauter le palier qui vient de finir n'a pas de sens.
2. **Trace du palier sauté** : seulement au bilan affiché à l'adulte (aucune colonne en base, donc rien ne part vers Supabase). Une trace par élève demande une migration `phono_` (soumise à ton accord) : à traiter dans B4 (bilan par type de structure).
3. **Ordre à l'intérieur d'un palier** : ordre du fichier `paliers-p1.json` (le même que le xlsx), jamais mélangé.
4. **Les 18 annonces** : textes de la task 2, à valider ou à corriger.
5. **Qui voit le pack** : le lien rapide `#/jeu?pack=pack-progressif-p1` est utilisable par tout adulte ; l'accueil des élèves le liste comme les autres modèles. Dis-moi si tu veux le masquer de l'accueil (`visibilite: 'prive'`).
6. **Commandes épurées** (non-lecteurs) : la zone de l'adulte devient visible à la fin d'un palier seulement. Sinon : un petit bouton « Adulte » en permanence.

## Calendrier et risques

- Les tasks 1 à 3 et 7 (partie données) ne touchent aucun fichier modifié par l'autre session : elles peuvent commencer tout de suite.
- Les tasks 4 à 6 modifient `Jeu.jsx` et `App.jsx` : avant de commencer, vérifier `git status` ; si l'autre session a des changements non commités dans ces fichiers, attendre son commit.
- Non vérifié à ce stade : le comportement du jeu en ligne des 93 mots (aucun audio du pack écouté, aucun mot joué).
