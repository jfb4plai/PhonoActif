# Moteur de Lilémo numérique (PhonoActif) : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le moteur pur (sans interface) : segmentation graphème-son pilotée par ManuLemme, filtres déterministes de choix de mots, analyse d'une liste de mots reçue, validation d'un pack de cartes, contrôle des sons manquants.

**Architecture:** Modules JavaScript ES purs dans `src/core/` (aucune dépendance du navigateur, réutilisables plus tard par React). Le lexique ManuLemme est converti une fois par un script Python en `data/lexique.json`, lu par le moteur. Les listes de mots par année et les « liaisons connues » sont des données passées en entrée, jamais écrites dans le code. Aucune IA.

**Tech Stack:** Node 24 (`node:test`, `node:assert`), ESM, Python 3.12 + openpyxl (script de conversion seulement). Aucune nouvelle dépendance.

**Spec:** `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\docs\superpowers\specs\2026-11-11-lilemo-numerique-design.md` (sections 6, 7, 12) et `phonoactif/phonoactif-spec.md` (tableau des écarts du cœur). Racine du code : `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\`.

## Global Constraints

- Aucune IA, aucun appel réseau, aucune clé : le choix des mots est manuel ou par filtres déterministes qui affichent leur raison.
- Un son n'entre dans l'app qu'après validation à l'oreille de JF : le moteur signale les sons sans fichier, il n'en fabrique jamais.
- Les codes phonétiques de ManuLemme distinguent majuscules et minuscules (S = /ʃ/, s = /s/, E = /ɛ/, e = /e/, O = /ɔ/, o = /o/) : aucune comparaison insensible à la casse sur les codes.
- Identifiants de sons : ceux du cœur de Lilémo (voir Task 2). `e_muet` désigne aussi le schwa prononcé (choix de ce plan, voir Task 2). `j` reste /ʒ/ ; le yod /j/ s'appelle `yod`.
- `data/lexique.json` n'est jamais commité ni publié : la licence de ManuLemme n'est pas vérifiée. Les tests n'utilisent que `tests/fixtures/lexique-extrait.json`.
- Aucun nom d'élève ni donnée d'élève dans ce plan. Le dépôt git est local, sans remote, sans push.
- Les mots sont comparés après `normaliserMot` (Unicode NFC, minuscules, apostrophe typographique remplacée par `'`, espaces réduits).
- Texte affiché à l'enseignant en français ; identifiants de code en français comme dans le cœur de Lilémo (`segmenter`, `cubes`, `son`).

## Review Focus

1. Mot absent de ManuLemme (pluriel, forme conjuguée, nom propre) : repli sur l'heuristique, marqué `aVerifier`, jamais silencieux (Task 5).
2. Confusion de casse entre codes (`S` pris pour `s`) : l'erreur constatée dans la liste de vocabulaire P1 de JF ; connaître `ch=ch` ne doit pas rendre `s=s` connu (Task 6).
3. Saisies sales : majuscule, espaces autour, apostrophe typographique, accents décomposés, cellule vide (Tasks 5 et 7).
4. Un même mot en plusieurs lignes (classe grammaticale différente, homographes à deux prononciations) : pas de doublon dans les propositions, pas de perte de la prononciation la plus fréquente (Tasks 5 et 6).
5. Code phonétique inconnu ou séquence non prévue (`A`, `G`, `8` seul, `gz`) dans une entrée : cube `son: null` et `aVerifier`, aucune exception (Tasks 2 et 3).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `package.json`, `.gitignore` | scripts de test, exclusions (`data/lexique.json`, `.superpowers/`) |
| `src/core/sons.js` | ids de sons, graphème par défaut, classe de cube, composition |
| `src/core/segmentation.js` | heuristique existante (`segmenterAuto`, `segmenterExplicite`, `segmenter`) |
| `src/core/intrus.js`, `src/core/reponse.js` | `choisirIntrus`, `reponseJuste` repris tels quels |
| `src/core/codes.js` | code ManuLemme vers son Lilémo |
| `src/core/lexique.js` | normalisation, lexique, segmentation depuis le lexique |
| `src/core/liaisons.js` | liaisons graphème=son, filtres de choix de mots |
| `src/core/analyseListe.js` | rapport sur une liste de mots reçue |
| `src/core/pack.js` | validation d'un pack de cartes |
| `src/core/audio.js` | sons requis et sons manquants |
| `src/core/index.js` | ré-exporte tout |
| `src/node/chargerLexique.js` | lit `data/lexique.json` (Node seulement) |
| `tools/construire_lexique.py` | ManuLemme xlsx vers `data/lexique.json` |
| `tools/montrer.js`, `tools/rapport_audio.js` | commandes de contrôle sur données réelles |
| `tests/fixtures/lexique-extrait.json` | lignes de ManuLemme pour les tests |

---

### Task 1: Squelette et reprise du cœur existant

**Files:**
- Create: `package.json`, `.gitignore`, `src/core/sons.js`, `src/core/segmentation.js`, `src/core/intrus.js`, `src/core/reponse.js`, `src/core/index.js`
- Test: `tests/core/heritage.test.js`, `tests/core/parite-html.test.js`
- Source (lecture seule, ne pas modifier) : `C:\Users\jfbeg\OneDrive\enseignement\pôle territorial\outils numériques\0 outils PLAI numériques au service de l'enseignant\Lilémo numérique\version phonémique.html` lignes 150-244 (bloc `<script id="core">`) et `test-lilemo.js`.

**Interfaces:**
- Produces (exports ES, comportement identique au bloc d'origine) : de `sons.js` : `VOYELLES_SONS: Set<string>`, `SON_PAR_DEFAUT: Record<string,string>`, `GRAPHEMES_TRIES: string[]`, `classeCube(son: string): 'muet'|'voyelle'|'consonne'` ; de `segmentation.js` : `segmenterAuto(mot: string): Cube[]`, `segmenterExplicite(mot: string, spec: string): Cube[]|null`, `segmenter(ligne: {Mot: string, Graphemes?: string}): {cubes: Cube[], auto: boolean, erreur?: string}` ; de `intrus.js` : `choisirIntrus(cubes: Cube[], nb: number, rng?: () => number): Cube[]` ; de `reponse.js` : `reponseJuste(construit: string[], attendu: string[], exigerAccents: boolean): boolean`. Type `Cube = { g: string, son: string }` (son vide = lettre muette).

- [ ] **Step 1:** Créer `package.json` : `"type": "module"`, scripts `"test": "node --test tests/"` et `"test:py": "python -m unittest discover -s tools -p \"test_*.py\""`. Créer `.gitignore` avec `data/lexique.json`, `data/lexique-rejets.json`, `.superpowers/`, `node_modules/`. Lancer `git init -b main` dans `phonoactif/` (sans remote).
- [ ] **Step 2: Write the failing test** `tests/core/heritage.test.js` : reprendre une à une les assertions des lignes 11 à 35 de `test-lilemo.js` dans des `test(...)` de `node:test` (digrammes et nasales, sons contextuels `c=s`, `s=z`, `g=g`, `g=j`, `e(muet)`, explicite valide et invalide, aucun son de nom de lettre, 200 tirages d'intrus sans miroir, accents, `classeCube`), en important depuis `../../src/core/index.js`.
- [ ] **Step 3: Run test to verify it fails** : `npm test` ; attendu : échec (modules absents).
- [ ] **Step 4:** Déplacer le code du bloc d'origine dans les cinq fichiers `src/core/*.js` sans changer une ligne de logique (constantes et fonctions telles quelles, `export` à la place de `module.exports`). `index.js` ré-exporte tout.
- [ ] **Step 5: Write the failing test** `tests/core/parite-html.test.js` : si la variable d'environnement `LILEMO_HTML` pointe un fichier existant, extraire le bloc `<script id="core">` comme le fait `test-lilemo.js` et vérifier que `segmenterAuto` donne le même résultat que la version ESM sur 30 mots (chat, bateau, lune, maman, animal, poule, pont, gnome, balle, cerise, rose, gomme, girafe, bibi, papa, tomate, fourchette, oiseau, écolier, petit, chapeau, fille, bien, geai, sept, se, garçon, wagon, kiwi, lapin) ; sinon `t.skip`.
- [ ] **Step 6: Run** `npm test` avec `LILEMO_HTML` posé sur le fichier source. Attendu : tous les tests passent, parité comprise.
- [ ] **Step 7: Commit** : `git add . && git commit -m "feat: reprise du coeur de Lilemo en modules ES avec tests"`.

---

### Task 2: Table des codes ManuLemme vers les sons de Lilémo

**Files:**
- Create: `src/core/codes.js`
- Modify: `src/core/sons.js` (ajouter `SONS_LILEMO`, `SONS_COMPOSES`, `composants`)
- Test: `tests/core/codes.test.js`
- Référence à relire avant d'écrire : `C:\Users\jfbeg\OneDrive\enseignement\pôle territorial\outils numériques\apprendre à lire\app pour créer texte à partir phonèmes déterminés\correspondance code phonétique ManuLemme - caractères IPA.xlsx` (en cas de différence avec la table ci-dessous, ce fichier fait foi : le signaler à JF).

**Interfaces:**
- Consumes: rien.
- Produces : `SONS_LILEMO: string[]` = les 36 ids du cœur (`a, an, b, ch, d, e_ferme, e_ouvert, e_muet, eu_ferme, eu_ouvert, f, g, gn, i, in, j, k, ks, l, m, n, o_ferme, o_ouvert, oi, on, ou, p, r, s, t, u, ui, un, v, w, z`) plus `yod` ; `SONS_COMPOSES: Record<string,string[]>` = `{ ij: ['i','yod'] }` ; `composants(son: string): string[]` (`''` donne `[]`, un id simple donne `[son]`, `ij` donne `['i','yod']`) ; `sonDepuisCodes(codes: string): string|null` : `''` pour une lettre muette, un id de `SONS_LILEMO` ou `ij`, `null` si le code ou la séquence est inconnu. Aucune exception.

Table à encoder (valeurs exactes) : `p b t d k g f v s z m n l w` vers le même id ; `S`→`ch`, `Z`→`j`, `N`→`gn`, `R`→`r`, `j`→`yod`, `i`→`i`, `e`→`e_ferme`, `E`→`e_ouvert`, `a`→`a`, `y`→`u`, `u`→`ou`, `o`→`o_ferme`, `O`→`o_ouvert`, `2`→`eu_ferme`, `9`→`eu_ouvert`, `@`→`an`, `§`→`on`, `5`→`in`, `1`→`un`, `%`→`e_muet`, `°`→`''`, `#`→`''`. Séquences : `wa`→`oi`, `8i`→`ui`, `ks`→`ks`, `ij`→`ij`. Non couverts volontairement (retour `null`) : `A`, `G`, `8` seul, `x`, toute autre séquence (par exemple `gz`).

- [ ] **Step 1: Write the failing test** `tests/core/codes.test.js` : `sonDepuisCodes('S') === 'ch'` et `sonDepuisCodes('s') === 's'` et les deux différents ; `sonDepuisCodes('E') === 'e_ouvert'` et `'e'` donne `'e_ferme'` ; `'#'` et `'°'` donnent `''` ; `'%'` donne `'e_muet'` ; `'wa'` donne `'oi'` ; `'8i'` donne `'ui'` ; `'ij'` donne `'ij'` ; `'§'`, `'@'`, `'5'`, `'1'` donnent `on`, `an`, `in`, `un` ; `'A'`, `'G'`, `'8'`, `'gz'`, `''` et `'zz'` donnent `null` sans lever d'exception ; `composants('ij')` égale `['i','yod']`, `composants('')` égale `[]`, `composants('ch')` égale `['ch']` ; chaque id retourné par la table (hors `''`) appartient à `SONS_LILEMO` ou à `Object.keys(SONS_COMPOSES)`.
- [ ] **Step 2: Run** `npm test -- tests/core/codes.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** `sonDepuisCodes`, `composants`, `SONS_LILEMO`, `SONS_COMPOSES` selon la table (lookup dans une `Map` clé par chaîne exacte, séquences d'abord, puis code unique). Exporter via `index.js`.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add src tests && git commit -m "feat: table des codes ManuLemme vers les sons de Lilemo"`.

---

### Task 3: Cubes depuis une entrée de lexique

**Files:**
- Create: `src/core/lexique.js` (premières fonctions), `tests/fixtures/lexique-extrait.json`
- Test: `tests/core/cubes-lexique.test.js`

**Interfaces:**
- Consumes: `sonDepuisCodes` (Task 2), `classeCube` (Task 1).
- Produces : type `EntreeLexique = { ortho: string, phono: string, classe: string, nbSyllabes: number, freq: { P1: number, P2: number, P1_5: number }, graphemes: string[], codes: string[] }` (`graphemes[i]` et `codes[i]` alignés un pour un, par exemple bien : `['b','i','en']` et `['b','j','5']`) ; `Cube` étendu en `{ g: string, son: string|null, aVerifier?: boolean }` ; `cubesDepuisEntree(entree: EntreeLexique): Cube[]` (un cube par graphème ; si `sonDepuisCodes` renvoie `null`, le cube a `son: null` et `aVerifier: true`) ; `classeCube(null)` renvoie `'inconnu'` (modifier `sons.js`).

- [ ] **Step 1:** Construire `tests/fixtures/lexique-extrait.json` : tableau d'`EntreeLexique` copié des lignes réelles de ManuLemme pour : le, se, petit, bien, maman, chat, nous, chien, lune, oiseau, fille, pain, sept, cerise, geai (graphèmes colonne d'index 12, codes colonne d'index 13, séparés par `.`, point initial retiré ; fréquences colonnes d'index 8 à 10). Ajouter les lignes réelles de très, été, examen, pomme et aujourd'hui en les imprimant par `python -X utf8 -c` depuis `ManuLemme-ver2.4.xlsx` (feuille `manulemme-ver2.4`, colonnes d'index 0, 1, 2, 7, 8, 9, 10, 12, 13). Ajouter une entrée fictive `zz` avec codes `['A']` pour les cas inconnus.
- [ ] **Step 2: Write the failing test** `cubes-lexique.test.js`, sons attendus (liste `g=son`, `''` = muet) : bien → `b=b, i=yod, en=in` ; chien → `ch=ch, i=yod, en=in` ; se → `s=s, e=e_muet` ; geai → `ge=j, ai=e_ouvert` ; fille → `f=f, ill=ij, e=''` ; sept → `s=s, e=e_ouvert, p='', t=t` ; chat → `ch=ch, a=a, t=''` ; oiseau → `oi=oi, s=z, eau=o_ferme` ; pain → `p=p, ain=in` ; lune → `l=l, u=u, n=n, e=''` ; cerise → `c=s, e=e_muet, r=r, i=i, s=z, e=''` ; l'entrée `zz` donne un cube `son: null` avec `aVerifier: true` et ne lève rien.
- [ ] **Step 3: Run** ; attendu : FAIL.
- [ ] **Step 4: Implement** `cubesDepuisEntree` ; ajouter le cas `null` à `classeCube`.
- [ ] **Step 5: Run** `npm test` ; attendu : PASS.
- [ ] **Step 6: Commit** : `git commit -am "feat: cubes depuis une entree de lexique, ecarts du coeur corriges"`.

---

### Task 4: Conversion de ManuLemme en `data/lexique.json`

**Files:**
- Create: `tools/construire_lexique.py`, `tools/test_construire_lexique.py`
- Output (non commité) : `data/lexique.json`, `data/lexique-rejets.json`

**Interfaces:**
- Produces : `python tools/construire_lexique.py <manulemme.xlsx> <sortie.json>` ; écrit un tableau d'`EntreeLexique` (Task 3), plus `<sortie>` voisine `lexique-rejets.json` (liste de `{ortho, raison}`), imprime `lus=<n> gardes=<n> rejetes=<n>`. Fonction importable `lire_feuille(chemin: str) -> tuple[list[dict], list[dict]]` (entrées, rejets).

Colonnes de la feuille `manulemme-ver2.4` (index à partir de 0, vérifiés sur la ligne `le` : `('le','l%','DET',2,2,1,2,1,32230.77,29404.72,27585.93,'l%','.l.e','.l.%',…)`) : 0 ortho, 1 phono, 2 classe, 7 nombre de syllabes, 8 fréquence P1, 9 fréquence P2, 10 fréquence P1-5, 12 segmentation en graphèmes (`.ch.a.t`), 13 segmentation en codes (`.S.a.#`). Les lignes dont la colonne 0 est vide ou égale à `ortho` sont ignorées. Les cellules numériques (codes `5`, `2`, `9`, `1`, `8`) sont converties en chaînes. Rejet si le nombre de graphèmes diffère du nombre de codes, ou si les graphèmes joints (minuscules, NFC) diffèrent de `ortho` normalisé.

- [ ] **Step 1: Write the failing test** `tools/test_construire_lexique.py` (`unittest`) : créer dans un dossier temporaire un classeur openpyxl de même disposition (trois lignes d'en-tête, puis `chat`/`Sa`/NC avec `.ch.a.t` et `.S.a.#`, `bien` avec `.b.i.en` et `.b.j.5` où le code final est le **nombre** 5, une ligne de rejet avec 3 graphèmes pour 2 codes) ; vérifier `graphemes == ['ch','a','t']`, `codes == ['S','a','#']`, `codes[-1] == '5'` (chaîne) pour bien, et que la ligne incohérente est dans les rejets avec une raison.
- [ ] **Step 2: Run** `npm run test:py` ; attendu : FAIL.
- [ ] **Step 3: Implement** `lire_feuille` (openpyxl, `read_only=True, data_only=True`) et la ligne de commande (UTF-8 explicite à l'écriture, `ensure_ascii=False`).
- [ ] **Step 4: Run** `npm run test:py` ; attendu : PASS.
- [ ] **Step 5: Vérification sur données réelles** : `python tools/construire_lexique.py "C:\Users\jfbeg\OneDrive\enseignement\pôle territorial\outils numériques\apprendre à lire\app pour créer texte à partir phonèmes déterminés\ManuLemme-ver2.4.xlsx" data/lexique.json`. Attendu : `lus` proche de 16004 (la feuille compte 16009 lignes, 5 d'en-tête) ; rapporter à JF les trois nombres exacts et dix exemples de rejets. Ne pas commiter `data/`.
- [ ] **Step 6: Commit** : `git add tools package.json && git commit -m "feat: conversion de ManuLemme en lexique.json"`.

---

### Task 5: Lexique, normalisation et segmentation d'un mot

**Files:**
- Modify: `src/core/lexique.js`
- Create: `src/node/chargerLexique.js`, `tools/montrer.js`
- Test: `tests/core/lexique.test.js`

**Interfaces:**
- Consumes: `cubesDepuisEntree` (Task 3), `segmenterAuto`, `segmenterExplicite` (Task 1).
- Produces : `normaliserMot(s: string): string` ; `type Lexique = { taille: number, entrees: EntreeLexique[], chercher(mot: string): EntreeLexique|null, chercherTous(mot: string): EntreeLexique[] }` ; `creerLexique(entrees: EntreeLexique[]): Lexique` (`chercher` renvoie, parmi les lignes de même `ortho` normalisé, celle de plus forte `freq.P1_5` ; `chercherTous` les renvoie toutes) ; `segmenterMot(mot: string, lexique: Lexique, options?: { graphemes?: string }): { cubes: Cube[], source: 'explicite'|'lexique'|'auto', aVerifier: boolean, raisons: string[] }` ; `chargerLexique(chemin: string): Promise<Lexique>` dans `src/node/chargerLexique.js`.

Règles de `segmenterMot` : `options.graphemes` valide (somme des graphèmes égale au mot) donne `source: 'explicite'`, `aVerifier: false` ; invalide donne le repli avec la raison `Graphemes « … » ne correspond pas à « … »`. Sinon, entrée trouvée et graphèmes joints égaux au mot normalisé donne `source: 'lexique'`, `aVerifier` vrai si un cube a `son: null`. Sinon repli sur `segmenterAuto`, `source: 'auto'`, `aVerifier: true`, raison `absent du lexique` ou `graphèmes du lexique incohérents avec le mot`.

- [ ] **Step 1: Write the failing test** `lexique.test.js` avec `creerLexique` sur la fixture : `normaliserMot('  Chat ')` égale `chat` ; `normaliserMot("aujourd’hui")` égale `aujourd'hui` ; `normaliserMot('e\u0301te\u0301')` égale `été` ; `segmenterMot('bien')` a `source: 'lexique'` et le résultat de Task 3 ; `segmenterMot('Chien ')` identique à `chien` (casse et espace) ; `segmenterMot('zorbalon')` a `source: 'auto'`, `aVerifier: true`, raison `absent du lexique` ; `segmenterMot('chat', lex, {graphemes: 'c-h-a-t'})` repasse par le lexique car l'explicite est invalide et mentionne la raison ; deux entrées fictives de même `ortho` (classes DET et PRO, fréquences 10 et 99) : `chercher` renvoie celle de fréquence 99, `chercherTous` en renvoie 2 ; `segmenterMot('')` ne lève pas d'exception et renvoie `cubes: []`.
- [ ] **Step 2: Run** ; attendu : FAIL.
- [ ] **Step 3: Implement** selon les règles ci-dessus ; `chargerLexique` lit le JSON en UTF-8 (`fs/promises`) et appelle `creerLexique`. `tools/montrer.js <mot…>` charge `data/lexique.json`, imprime pour chaque mot `g=son` des cubes, la source et les raisons.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Vérification sur données réelles** : `node tools/montrer.js bien chien se geai fille sept chat zorbalon`. Attendu : bien et chien donnent `i=yod, en=in` ; se donne `e=e_muet` ; geai donne `ge=j, ai=e_ouvert` ; fille donne `ill=ij` ; sept donne `p=''` ; zorbalon `source: auto`. Coller la sortie complète dans le compte rendu.
- [ ] **Step 6: Commit** : `git add src tools tests && git commit -m "feat: lexique et segmentation pilotee par ManuLemme avec repli signale"`.

---

### Task 6: Liaisons graphème-son et filtres de choix de mots

**Files:**
- Create: `src/core/liaisons.js`
- Test: `tests/core/liaisons.test.js`

**Interfaces:**
- Consumes: `Lexique`, `segmenterMot`/`cubesDepuisEntree` (Tasks 3 et 5).
- Produces : clé de liaison `'<graphème>=<son>'` (son vide : `'t='`) ; `liaisonsDe(cubes: Cube[]): string[]` (une clé par cube, dans l'ordre, cube `son: null` donne `'<g>=?'`) ; `liaisonsDeMots(mots: string[], lexique: Lexique): { liaisons: Set<string>, absents: string[] }` (union des liaisons des mots trouvés ; les mots non trouvés dans `absents`) ; `type Criteres = { liaisonsConnues: Set<string>, tolerance?: number /* défaut 0 */, classes?: string[], nbSyllabesMax?: number, freqMinP1?: number, exclure?: Set<string>, contient?: string[] }` ; `type MotPropose = { mot: string, entree: EntreeLexique, liaisons: string[], inconnues: string[], raisons: string[] }` ; `filtrerMots(lexique: Lexique, criteres: Criteres): MotPropose[]` (triés par `freq.P1` décroissante ; un seul résultat par `ortho` normalisé, celui de `chercher` ; exclut tout mot dont une liaison est `'<g>=?'` ; `inconnues` = liaisons hors `liaisonsConnues` ; garde le mot si `inconnues.length <= tolerance` ; `contient` = liaisons obligatoires ; `raisons` en français, par exemple `contient ch=ch`, `2 syllabes`, `fréquence P1 : 1714`, `toutes les liaisons connues`).

- [ ] **Step 1: Write the failing test** `liaisons.test.js` sur la fixture : `liaisonsDe(segmenterMot('chat').cubes)` égale `['ch=ch','a=a','t=']` ; avec `liaisonsConnues = {'ch=ch','a=a','t='}`, `filtrerMots` propose `chat` avec `inconnues: []` et une raison `toutes les liaisons connues` ; **casse** : avec seulement `{'s=s','a=a','t='}`, `chat` n'est pas proposé (ch=ch inconnu) et `liaisonsConnues` contenant `s=s` ne rend pas `ch=ch` connu ; `tolerance: 1` propose `chat` dans ce dernier cas, avec `inconnues: ['ch=ch']` ; `contient: ['ch=ch']` ne renvoie que des mots contenant cette liaison ; deux lignes de même `ortho` dans la fixture donnent un seul résultat ; `nbSyllabesMax: 1` exclut `lune` ; `exclure: new Set(['chat'])` l'exclut ; l'entrée `zz` (cube inconnu) n'est jamais proposée ; `liaisonsDeMots(['chat','zorbalon'], lex)` renvoie les trois liaisons de chat et `absents: ['zorbalon']`.
- [ ] **Step 2: Run** ; attendu : FAIL.
- [ ] **Step 3: Implement** ; comparaisons de clés par égalité stricte de chaînes uniquement.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add src tests && git commit -m "feat: liaisons graphemes-sons et filtres deterministes de choix de mots"`.

---

### Task 7: Analyse d'une liste de mots reçue

**Files:**
- Create: `src/core/analyseListe.js`
- Test: `tests/core/analyseListe.test.js`

**Interfaces:**
- Consumes: `Lexique`, `segmenterMot`, `liaisonsDe`, `normaliserMot`.
- Produces : `type LigneListe = { mot: string, niveau?: string, source?: string }` ; `type RapportListe = { total: number, trouves: number, absents: string[], doublons: string[], aVerifier: string[], parMot: { mot: string, trouve: boolean, liaisons: string[], inconnues: string[] }[], liaisonsRequises: Record<string, number> }` ; `analyserListe(lignes: LigneListe[], lexique: Lexique, liaisonsConnues?: Set<string>): RapportListe` (`liaisonsRequises` = pour chaque liaison, le nombre de mots de la liste qui la contiennent ; `doublons` = mots présents plusieurs fois après normalisation ; une ligne vide ou sans `mot` est ignorée et non comptée ; `inconnues` est vide si `liaisonsConnues` est omis).

- [ ] **Step 1: Write the failing test** : liste `[chat, Chat , zorbalon, '', lune]` avec la fixture : `total` 4 (ligne vide ignorée), `doublons` égale `['chat']`, `absents` égale `['zorbalon']`, `aVerifier` contient `zorbalon`, `liaisonsRequises['ch=ch']` égale 1 (doublon compté une fois), `parMot` de chat a `trouve: true` ; avec `liaisonsConnues = {'a=a','t='}`, `inconnues` de chat égale `['ch=ch']` ; une ligne `{ mot: undefined }` ne lève pas d'exception.
- [ ] **Step 2: Run** ; attendu : FAIL.
- [ ] **Step 3: Implement.** Les mots d'une même ligne séparés par virgule ne sont pas éclatés par cette fonction (le découpage de listes officielles reste du travail de données hors moteur).
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add src tests && git commit -m "feat: analyse d'une liste de mots recue"`.

---

### Task 8: Validation d'un pack de cartes

**Files:**
- Create: `src/core/pack.js`
- Test: `tests/core/pack.test.js`

**Interfaces:**
- Consumes: `Lexique`, `segmenterExplicite`, `normaliserMot`.
- Produces : `type Carte = { id: string, mot: string, image_sans_mot: string, image_avec_mot?: string, graphemes?: string, niveau?: string, source: string, licence: string }` ; `type Manifest = { nom: string, cartes: Carte[] }` ; `validerPack(manifest: Manifest, fichiers: Set<string>, lexique: Lexique): { erreurs: string[], avertissements: string[] }` (messages en français, chacun préfixé par l'`id` de la carte).

Erreurs : `id` vide ou en double ; `mot` vide ; `image_sans_mot` absente de `fichiers` ; `image_avec_mot` déclarée mais absente de `fichiers` ; `image_avec_mot` identique à `image_sans_mot` ; `source` ou `licence` vide ; `graphemes` fournis qui ne recomposent pas le mot. Avertissements : `image_avec_mot` non déclarée (« mode avec mot indisponible pour cette carte ») ; mot absent du lexique et sans `graphemes` (« segmentation à vérifier ») ; mot en double dans le pack ; `licence` égale à `inconnue` (« licence à vérifier »).

- [ ] **Step 1: Write the failing test** : pack valide minimal (deux cartes, fichiers présents) sans erreur ; un test par cas d'erreur et d'avertissement ci-dessus avec le texte exact de la raison recherché par `includes` ; `fichiers` vide donne une erreur par carte ; `manifest.cartes` vide donne une erreur `pack vide` ; `manifest` sans `cartes` ne lève pas d'exception et signale `pack vide`.
- [ ] **Step 2: Run** ; attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add src tests && git commit -m "feat: validation d'un pack de cartes"`.

---

### Task 9: Contrôle des sons manquants

**Files:**
- Create: `src/core/audio.js`, `tools/rapport_audio.js`
- Test: `tests/core/audio.test.js`

**Interfaces:**
- Consumes: `composants`, `SONS_LILEMO` (Task 2), `Cube`.
- Produces : `sonsRequis(cubes: Cube[]): string[]` (ids uniques après `composants`, sans `''` ni `null`) ; `sonsManquants(sons: Iterable<string>, disponibles: Set<string>): string[]` (triés) ; `tools/rapport_audio.js <dossier> [extension=.wav]` : liste les sons de `SONS_LILEMO` sans fichier `<id><extension>` dans le dossier.

- [ ] **Step 1: Write the failing test** : `sonsRequis` de fille (`f=f, ill=ij, e=''`) égale `['f','i','yod']` ; ne contient ni `''` ni `null` ; `sonsManquants(['a','yod','i'], new Set(['a']))` égale `['i','yod']`.
- [ ] **Step 2: Run** ; attendu : FAIL.
- [ ] **Step 3: Implement** les deux fonctions et la commande.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Vérification sur données réelles** : `node tools/rapport_audio.js "C:\Users\jfbeg\OneDrive\enseignement\pôle territorial\outils numériques\0 outils PLAI numériques au service de l'enseignant\Lilémo numérique\sons"`. Attendu : exactement `e_muet`, `eu_ouvert`, `i`, `o_ferme`, `o_ouvert`, `yod` manquants (31 fichiers .wav présents au 2026-11-11). Tout autre résultat est à signaler, pas à corriger.
- [ ] **Step 6: Commit** : `git add src tools tests && git commit -m "feat: controle des sons manquants"`.

---

## Self-Review

**Couverture de la spec.** Section 7 : corrections du cœur (ien, e de monosyllabe, geai, yod, sept) Tasks 2, 3, 5 ; génération des graphèmes depuis ManuLemme avec heuristique réservée aux absents, signalés « à vérifier » Tasks 4, 5 ; filtres déterministes avec raison affichée Task 6 ; sons validés et manquants Task 9. Section 6 : validation du pack (deux faces, source, licence, alt par le mot) Task 8. Section 12 (liste P1 de JF, listes à venir) : Task 7 et paramètre `liaisonsConnues`. **Hors de ce plan, volontairement** : enregistrement des essais, tableau de bord, relevé, assignation HubActif, interface React, jeux, import des PDF/tableurs de listes, export PDF des cartes. Chacun aura son plan.

**Cohérence des types.** `Cube`, `EntreeLexique`, `Lexique`, `segmenterMot`, `liaisonsDe`, `normaliserMot` définis en Tasks 1, 3, 5 et utilisés avec les mêmes noms en 6 à 9.

**Proportion.** Plan court, signatures et assertions seulement ; aucun corps de fonction écrit.

**Choix de ce plan à confirmer par JF (non décidés par lui) :** `e_muet` sert d'identifiant au schwa prononcé ; `A`, `G`, `8` seul et `gz` non traités (à vérifier) ; JavaScript ES sans dépendance et `node:test` ; dépôt git local sans remote ; `lexique.json` jamais commité.
