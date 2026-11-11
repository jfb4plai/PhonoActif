# Listes de mots par année : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importer des listes de mots annotées par année (le tableur « Vocabulaire orthographique de base », la liste P1 de JF, d'autres à venir), en tirer sans rien écrire dans le code les liaisons graphème-son supposées connues à chaque année, proposer des mots d'une année sans IA, et préparer la liste des cartes à fabriquer.

**Architecture:** Un format de liste unique (`Liste`) avec source et licence obligatoires. Un extracteur Python lit un tableur en lignes brutes ; le moteur Node nettoie, valide et analyse. Les années, les mots et les liaisons connues restent des données ; seul le mécanisme est du code.

**Tech Stack:** Node 24 (`node:test`), ESM, Python 3.12 + openpyxl (extraction seulement). Suite du moteur (plans `2026-11-11-moteur-plan.md` et `2026-11-11-corrections-plan.md`, exécutés, 140 tests).

**Spec:** `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\docs\superpowers\specs\2026-11-11-lilemo-numerique-design.md` (sections 6, 7, et « Liste VOB »). Racine du code : `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\`.

## Global Constraints

- Aucune IA. Les mots proposés sortent de listes fournies et de filtres déterministes qui disent pourquoi.
- Toute liste porte une `source` et une `licence` non vides ; sans elles, l'import est refusé. Les droits du tableur VOB sont non vérifiés : `data/listes/` et `packs/` ne sont jamais commités (`.gitignore`).
- Aucune année, aucun mot ni aucune liaison connue n'est écrit dans le code ; tout vient du fichier de liste.
- Niveaux autorisés d'une liste : ceux qu'elle déclare dans `niveaux` (ordre = progression). Un niveau inconnu n'est jamais inventé ni corrigé : l'entrée est écartée avec un avertissement.
- Les liaisons se comparent par chaînes exactes (`S` n'est pas `s`).
- Un mot à vérifier (absent du lexique, code inconnu, multi-mots non validé) ne contribue jamais aux liaisons connues ; il est listé à part, jamais silencieusement omis.
- Les signatures existantes du moteur ne changent pas : les ajouts sont des paramètres facultatifs.
- Noms de fichiers de cartes : sans accent ni espace, identiques pour la carte physique et pour l'écran (lien avec la version physique, carte de 63 x 88 mm).

## Review Focus

1. Saisies du tableur : « août ou aout » (deux variantes), « asseoir (s') » (parenthèse = remarque), « abimer (abîmer) » (parenthèse = variante), espaces finaux, cellules vides : nettoyées, testées (Task 1).
2. Un même mot présent dans plusieurs années ou plusieurs fois avec des natures différentes : l'année la plus précoce est gardée, avec un avertissement (Task 1).
3. Colonnes décalées, niveau vide ou hors liste (« P7 », « CE1 ») : entrée écartée avec avertissement, rien d'inventé (Tasks 1 et 2).
4. Mots absents ou à vérifier : exclus des liaisons connues mais listés dans le résultat (Task 3).
5. Mots de cartes aux noms de fichiers identiques après suppression des accents (« pêche » et « peche ») : suffixe, jamais d'écrasement (Task 6).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/core/listes.js` | nettoyage des mots, création et validation d'une `Liste`, mots par niveau |
| `src/core/progression.js` | liaisons nouvelles et cumulées par année ; mots proposés pour une année |
| `src/core/liaisons.js` (modifié) | critère facultatif `motsPermis` de `filtrerMots` |
| `src/core/pack.js` (modifié) | fonctions de préparation d'un pack (`slugMot`, `preparerPack`) |
| `tools/extraire_liste_xlsx.py` | tableur vers lignes brutes JSON |
| `tools/construire_liste.js` | lignes brutes vers `data/listes/<id>.json` |
| `tools/analyser_liste.js` | rapport par année sur données réelles |
| `tools/preparer_pack.js` | manifeste de pack et liste à fabriquer |
| `tools/construire_revue.js` (modifié) | option `--liste` |

---

### Task 1: Format de liste, nettoyage des mots, validation

**Files:**
- Create: `src/core/listes.js`
- Modify: `src/core/index.js`, `.gitignore` (ajouter `data/listes/` et `packs/`)
- Test: `tests/core/listes.test.js`

**Interfaces:**
- Consumes: `normaliserMot` (lexique.js).
- Produces :
  - `nettoyerMot(brut: string): { mots: string[], remarque: string }` : espaces de fin retirés ; `ou` entre deux mots donne deux mots (`août ou aout` donne `['août','aout']`) ; une parenthèse dont le contenu est un mot de lettres seules de trois lettres ou plus est une variante ajoutée aux mots (`abimer (abîmer)` donne `['abimer','abîmer']`) ; toute autre parenthèse est retirée du mot et gardée dans `remarque` (`asseoir (s')` donne `['asseoir']` et `remarque: "(s')"`) ; mots normalisés par `normaliserMot` ; un brut vide donne `{ mots: [], remarque: '' }`.
  - `type LigneBrute = { mot: string, niveau?: string, nature?: string, remarque?: string }`.
  - `type EntreeListe = { mot: string, niveau: string, nature: string, remarque: string, motBrut: string }`.
  - `type Liste = { id: string, nom: string, source: string, licence: string, niveaux: string[], entrees: EntreeListe[] }`.
  - `creerListe(params: { id: string, nom: string, source: string, licence: string, niveaux: string[], lignes: LigneBrute[] }): { liste: Liste, avertissements: string[] }` : lève une `Error` en français si `id`, `nom`, `source` ou `licence` est vide ou si `niveaux` est vide ; une ligne sans mot utilisable est ignorée sans avertissement ; un niveau absent de `niveaux` écarte l'entrée avec l'avertissement `<mot> : niveau inconnu « <niveau> »` ; un mot présent dans plusieurs niveaux garde le niveau le plus précoce (selon l'ordre de `niveaux`) avec l'avertissement `<mot> : présent en <niveau> et <niveau>, gardé en <niveau précoce>` ; un mot répété au même niveau est fusionné (natures jointes par `, ` sans doublon) sans avertissement ; entrées triées par niveau (ordre de `niveaux`) puis par mot.
  - `motsDuNiveau(liste: Liste, niveau: string): string[]` ; `motsJusquAuNiveau(liste: Liste, niveau: string): string[]` (niveaux de l'ordre déclaré jusqu'à celui-ci inclus ; niveau inconnu : liste vide).

- [ ] **Step 1: Write the failing test** : les cinq exemples de `nettoyerMot` ci-dessus plus `'  absent '`, `''` et `'à peu près'` (un seul mot, espaces gardés) ; `creerListe` : champ obligatoire vide lève une erreur contenant le nom du champ ; une ligne `{ mot: 'à', niveau: 'P1' }` donne une entrée ; `P7` et niveau vide écartés avec avertissement ; mot en `P3` et en `P1` gardé en `P1` avec l'avertissement exact ; mot répété en `P2` avec natures `n.f.` et `v.` fusionné en `n.f., v.` ; ligne `{ mot: '  ' }` ignorée ; `août ou aout` donne deux entrées ; tri par niveau puis mot ; `motsDuNiveau` et `motsJusquAuNiveau` sur une liste P1, P2, P3.
- [ ] **Step 2: Run** `node --test tests/core/listes.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** selon les règles ; ajouter à `.gitignore` ; exporter via `index.js`.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: format de liste par annee, nettoyage et validation"`.

---

### Task 2: Extraction d'un tableur et construction de la liste

**Files:**
- Create: `tools/extraire_liste_xlsx.py`, `tools/test_extraire_liste_xlsx.py`, `tools/construire_liste.js`
- Test: `tools/test_extraire_liste_xlsx.py`, `tests/tools/construire-liste.test.js`

**Interfaces:**
- Consumes: `creerListe` (Task 1).
- Produces :
  - `python tools/extraire_liste_xlsx.py <fichier.xlsx> <sortie.json> --mot-col N [--niveau-col N] [--nature-col N] [--remarque-col N] [--feuille NOM] [--premiere-ligne N]` : colonnes et lignes comptées depuis 0 et 1 respectivement (`--premiere-ligne` en numéro de ligne Excel, défaut 1) ; écrit un tableau `LigneBrute` (cellules vides vers chaîne vide, nombres vers texte, espaces de fin conservés pour que le nettoyage soit testé côté Node) ; imprime `lignes=<n>`. Fonction importable `extraire(chemin, mot_col, niveau_col=None, nature_col=None, remarque_col=None, feuille=None, premiere_ligne=1) -> list[dict]`.
  - `node tools/construire_liste.js <brut.json> --id X --nom "…" --source "…" --licence "…" --niveaux P1,P2,P3,P4,P5,P6` : écrit `data/listes/<id>.json` (objet `Liste`), imprime `entrées=<n> avertissements=<n>` puis chaque avertissement ; refuse (code 2) sans `--source` ou `--licence`.

- [ ] **Step 1: Write the failing tests** : Python : classeur temporaire de cinq lignes (deux lignes de titre, une ligne vide) lu avec `premiere_ligne=3` donne les lignes attendues avec les bons champs ; un nombre en colonne mot devient texte ; colonne facultative absente : champ vide. Node (`construire-liste.test.js`, dossier temporaire, appel de la fonction de construction exportée par un module `src/node/liste.js` : `construireListeDepuisBrut(cheminBrut, params, dossierSortie): Promise<{ liste, avertissements }>`) : écrit le fichier, source vide lève une erreur, JSON brut illisible lève une erreur contenant `illisible`.
- [ ] **Step 2: Run** `npm run test:py` et `node --test tests/tools/construire-liste.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** les deux outils et `src/node/liste.js`.
- [ ] **Step 4: Run** `npm test` et `npm run test:py` ; attendu : PASS.
- [ ] **Step 5: Verify sur le tableur de JF** : `python tools/extraire_liste_xlsx.py "C:\Users\jfbeg\Downloads\VOB\Vocabulaire orthographique de base.xlsx" data/vob-brut.json --mot-col 1 --niveau-col 4 --nature-col 2 --remarque-col 3 --premiere-ligne 3` puis `node tools/construire_liste.js data/vob-brut.json --id vob --nom "Vocabulaire orthographique de base" --source "Fichier reçu de JF le 2026-11-11 (VOB, année suggérée P1 à P6)" --licence inconnue --niveaux P1,P2,P3,P4,P5,P6`. Attendu : environ 3457 lignes brutes ; rapporter le nombre d'entrées, les avertissements (doublons entre années) et vérifier que « août ou aout » donne deux entrées. `data/` n'est pas commité (`data/vob-brut.json` ajouté au `.gitignore`).
- [ ] **Step 6: Commit** : `git add . && git commit -m "feat: extraction d'un tableur et construction d'une liste"`.

---

### Task 3: Liaisons connues par année

**Files:**
- Create: `src/core/progression.js`
- Modify: `src/core/index.js`
- Test: `tests/core/progression.test.js`

**Interfaces:**
- Consumes: `Liste`, `motsDuNiveau` (Task 1), `segmenterMot`, `liaisonsDe`, `Lexique`, `Corrections`.
- Produces : `type NiveauProgression = { niveau: string, nouvelles: string[], cumulees: Set<string>, motsRetenus: number, motsIgnores: { mot: string, raison: string }[] }` ; `liaisonsParNiveau(liste: Liste, lexique: Lexique, corrections?: Corrections): NiveauProgression[]` (un élément par niveau de `liste.niveaux`, dans l'ordre ; un mot est retenu si `segmenterMot(mot, lexique, { corrections })` renvoie `aVerifier: false` ; sinon il est dans `motsIgnores` avec la première raison de `segmenterMot` ; `nouvelles` = liaisons des mots retenus du niveau absentes des niveaux précédents, triées ; `cumulees` = union de tous les niveaux jusqu'à celui-ci) ; `liaisonsConnuesJusqua(progression: NiveauProgression[], niveau: string): Set<string>` (vide si niveau inconnu).

- [ ] **Step 1: Write the failing test** (fixture `lexique-extrait.json`, liste fabriquée par `creerListe` avec niveaux `P1,P2,P3` : P1 `chat`, P2 `lune` et `zorbalon`, P3 `pain` et `examen`) : P1 nouvelles `['a=a','ch=ch','t=']` ; P2 nouvelles contiennent `l=l` et `u=u` mais pas `a=a` ; `zorbalon` dans `motsIgnores` de P2 avec la raison `absent du lexique` et aucune de ses liaisons dans les cumulées ; `examen` dans `motsIgnores` de P3 (code inconnu) ; avec une correction `corrige` pour `examen`, il devient retenu et ses liaisons entrent dans P3 ; `cumulees` croît d'un niveau à l'autre ; **casse** : `ch=ch` connu en P1 ne rend pas `s=s` connu ; `liaisonsConnuesJusqua(prog, 'P2')` égale les cumulées de P2 ; niveau inconnu : ensemble vide ; liste sans aucune entrée : un élément vide par niveau, sans exception.
- [ ] **Step 2: Run** `node --test tests/core/progression.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: liaisons connues par annee, tirees d'une liste"`.

---

### Task 4: Rapport par année sur données réelles

**Files:**
- Create: `tools/analyser_liste.js`, `src/core/rapportListe.js`
- Modify: `src/core/index.js`
- Test: `tests/core/rapportListe.test.js`

**Interfaces:**
- Consumes: `analyserListe`, `estMultiMot`, `liaisonsParNiveau`.
- Produces : `type LigneRapport = { niveau: string, mots: number, trouves: number, absents: number, aVerifier: number, multiMots: number, liaisonsNouvelles: number, motsIgnores: number }` ; `rapportParNiveau(liste: Liste, lexique: Lexique, corrections?: Corrections): { lignes: LigneRapport[], total: LigneRapport }` ; `node tools/analyser_liste.js <data/listes/id.json>` imprime un tableau lisible (une ligne par année et une ligne « total ») puis 20 mots absents d'exemple.

- [ ] **Step 1: Write the failing test** (fixture et mini-liste de Task 3) : une ligne par niveau déclaré, nombres exacts (`mots`, `trouves`, `absents`, `aVerifier`) ; `multiMots` compte les entrées contenant espace, apostrophe ou trait d'union ; `total` somme les lignes ; niveau sans mot : ligne de zéros ; une correction valide fait baisser `aVerifier`.
- [ ] **Step 2: Run** `node --test tests/core/rapportListe.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** la fonction et la commande.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Verify sur le VOB** : `node tools/analyser_liste.js data/listes/vob.json`. Attendu : P1 52 mots dont 46 trouvés ; total proche de 2933 trouvées sur 3457 (écart possible dû à la fusion des variantes : l'expliquer dans le compte rendu).
- [ ] **Step 6: Commit** : `git add . && git commit -m "feat: rapport par annee d'une liste"`.

---

### Task 5: Proposer des mots pour une année

**Files:**
- Modify: `src/core/liaisons.js`
- Modify: `src/core/progression.js`
- Test: `tests/core/proposition-annee.test.js`

**Interfaces:**
- Consumes: `filtrerMots`, `liaisonsParNiveau`, `liaisonsConnuesJusqua`, `Liste`, `motsDuNiveau`.
- Produces : critère facultatif `Criteres.motsPermis?: Set<string>` dans `filtrerMots` (mots normalisés ; si présent, seuls ces mots sont proposés) ; `proposerPourNiveau(lexique: Lexique, liste: Liste, niveau: string, options?: { corrections?: Corrections, tolerance?: number, nbSyllabesMax?: number, classes?: string[], jusquAuNiveau?: boolean }): MotPropose[]` : mots de la liste à ce niveau (ou jusqu'à ce niveau si `jusquAuNiveau`), dont toutes les liaisons sont connues à la fin du niveau précédent (tolérance par défaut 0) ; cas du premier niveau : liaisons connues = ensemble vide ; chaque `MotPropose.raisons` gagne `année suggérée : <niveau>` en tête ; liaisons inconnues listées dans `inconnues`.

- [ ] **Step 1: Write the failing test** : `filtrerMots` avec `motsPermis: new Set(['chat'])` ne renvoie que `chat` même si d'autres mots sont admissibles ; `motsPermis` vide ne renvoie rien ; `proposerPourNiveau` sur la mini-liste (P1 chat, P2 lune et pain) : pour `P2` avec tolérance 0, `lune` est absent (`l=l`, `u=u`, `n=n` inconnus en fin de P1) et présent avec `tolerance: 4` ; pour `P1`, `chat` n'est pas proposé à tolérance 0 (rien n'est connu avant P1) et l'est à tolérance 3 ; la raison `année suggérée : P2` figure ; `jusquAuNiveau: true` ajoute les mots de P1 ; niveau inconnu : tableau vide.
- [ ] **Step 2: Run** `node --test tests/core/proposition-annee.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` ; attendu : PASS (tests existants de `filtrerMots` inclus).
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: mots proposes pour une annee selon les liaisons deja connues"`.

---

### Task 6: Préparer un pack de cartes à fabriquer

**Files:**
- Modify: `src/core/pack.js`
- Create: `tools/preparer_pack.js`
- Modify: `.gitignore` (déjà `packs/` en Task 1)
- Test: `tests/core/preparer-pack.test.js`

**Interfaces:**
- Consumes: `MotPropose`, `Lexique`, `Corrections`, `segmenterMot`, `Manifest`, `Carte`.
- Produces : `slugMot(mot: string, dejaPris?: Set<string>): string` (minuscules, accents retirés, tout caractère hors `a-z0-9` remplacé par `-`, tirets répétés et de bord retirés ; si le résultat est dans `dejaPris`, suffixe `-2`, `-3`… ; ajoute le résultat à `dejaPris` ; mot sans lettre renvoie `carte`) ; `preparerPack(params: { nom: string, mots: string[], source: string, licence: string, lexique: Lexique, corrections?: Corrections }): { manifest: Manifest, csv: string }` (une carte par mot ; `id` = slug ; `image_sans_mot` = `<slug>.png` ; `image_avec_mot` = `<slug>-mot.png` ; `graphemes` laissé vide ; `source` et `licence` repris ; `csv` en UTF-8 précédé d'un BOM, séparateur `;`, en-tête `mot;id;fichier sans mot;fichier avec mot;niveau;graphèmes proposés;à vérifier`, la colonne « graphèmes proposés » = graphèmes de `segmenterMot` joints par `.`, « à vérifier » = `oui` ou `non`) ; `node tools/preparer_pack.js --liste data/listes/vob.json --niveau P2 [--jusqua] --nom p2-essai --source "…" --licence "…" [--tolerance N]` écrit `packs/<nom>/manifest.json` et `packs/<nom>/a-fabriquer.csv` et imprime le nombre de cartes.

- [ ] **Step 1: Write the failing test** : `slugMot('pêche')` égale `peche` ; deux appels `pêche` puis `peche` avec le même `dejaPris` donnent `peche` et `peche-2` ; `slugMot("l'ami")` égale `l-ami` ; `slugMot('à côté')` égale `a-cote` ; `slugMot('!!!')` égale `carte` ; `preparerPack` sur `chat` et `lune` donne deux cartes aux champs attendus, un `csv` commençant par le BOM, trois lignes (en-tête et deux cartes), `à vérifier` égal `non` pour chat et `oui` pour un mot absent ; le manifeste produit passe `validerPack` avec les fichiers déclarés présents, sans erreur (licence `propre`) ; `licence: 'inconnue'` donne l'avertissement `licence à vérifier` ; `source` vide : erreur.
- [ ] **Step 2: Run** `node --test tests/core/preparer-pack.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** les deux fonctions et la commande (mots issus de `proposerPourNiveau`).
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Verify** : `node tools/preparer_pack.js --liste data/listes/vob.json --niveau P2 --nom p2-essai --source "VOB, fichier de JF" --licence inconnue --tolerance 3` ; ouvrir le CSV (compter les lignes, vérifier l'ouverture sans accents cassés dans Excel n'est pas possible ici : le dire) ; supprimer `packs/p2-essai` ensuite.
- [ ] **Step 6: Commit** : `git add . && git commit -m "feat: preparation d'un pack et liste des cartes a fabriquer"`.

---

### Task 7: Les mots d'une liste dans la file de revue

**Files:**
- Modify: `tools/construire_revue.js`, `tools/revue_liste.js`
- Test: `tests/core/revue-liste.test.js`

**Interfaces:**
- Consumes: `fileDeRevue` (option `motsSupplementaires`), `Liste`.
- Produces : option `--liste <data/listes/id.json>` des deux commandes : tous les mots de la liste sont passés en `motsSupplementaires` ; `motsDeListe(liste: Liste): string[]` (mots distincts, ordre des niveaux) dans `src/core/listes.js`.

- [ ] **Step 1: Write the failing test** : `motsDeListe` sur la mini-liste renvoie les mots dans l'ordre des niveaux sans doublon ; `fileDeRevue(lex, corrections, { motsSupplementaires: motsDeListe(liste) })` contient `zorbalon` (absent) et un multi-mots de la liste, mais ni `chat` ni un mot déjà corrigé valide.
- [ ] **Step 2: Run** `node --test tests/core/revue-liste.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** la fonction et l'option des deux commandes.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Verify** : `node tools/revue_liste.js --liste data/listes/vob.json --limite 10`. Attendu : la file contient les 823 mots à code inconnu de ManuLemme plus les absents et multi-mots du VOB (rapporter les nombres exacts).
- [ ] **Step 6: Commit** : `git add . && git commit -m "feat: les mots d'une liste dans la file de revue"`.

---

## Self-Review

**Couverture.** Listes par année comme données avec source et licence Tasks 1 et 2 ; liaisons connues tirées des listes Task 3 ; rapport sur le VOB Task 4 ; mots proposés par année sans IA Task 5 ; liste des cartes à fabriquer avec noms de fichiers communs au physique et à l'écran Task 6 ; absents et multi-mots dans la revue Task 7. **Hors de ce plan** : règle de dérivation des féminins et pluriels (piste notée dans la spec), import de la version Word, habillage visuel, interface React, droits des listes.

**Cohérence des types.** `Liste`, `EntreeListe`, `NiveauProgression`, `MotPropose`, `Manifest` définis en Tasks 1, 3 et existants ; mêmes noms ensuite.

**Proportion.** Signatures, règles et assertions ; aucun corps de fonction écrit.

**Choix de ce plan à confirmer par JF (non décidés par lui) :** `data/listes/` et `packs/` non commités tant que les droits ne sont pas vérifiés ; l'année la plus précoce l'emporte quand un mot figure dans plusieurs années ; les mots à vérifier ne contribuent pas aux liaisons connues ; tolérance par défaut 0 pour proposer un mot (aucune liaison nouvelle).
