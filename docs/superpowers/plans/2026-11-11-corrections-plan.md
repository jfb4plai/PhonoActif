# Corrections et validation phonétiques : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à JF (ou à un enseignant) de vérifier, corriger et valider toute déviation phonétique et toute entrée à plusieurs mots, sans toucher à ManuLemme, avec un écran de revue autonome et des corrections qui survivent à la régénération du lexique.

**Architecture:** Un dictionnaire de corrections (`data/corrections.json`) prioritaire sur ManuLemme, géré par des fonctions pures dans `src/core/`. Une file de revue classe les mots à vérifier par fréquence. Une page HTML autonome, générée par un outil Node, sert d'écran de revue provisoire (hors ligne, ouverte en `file://`) et exporte un fichier de corrections que la ligne de commande fusionne.

**Tech Stack:** Node 24 (`node:test`), ESM, HTML/CSS/JS sans dépendance ni appel réseau. Suite du moteur du plan `2026-11-11-moteur-plan.md` (déjà exécuté, 64 tests).

**Spec:** `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\docs\superpowers\specs\2026-11-11-lilemo-numerique-design.md` (section 7, « Corrections et validation »). Racine du code : `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\`.

## Global Constraints

- Aucune IA. L'oreille de JF fait foi : le moteur propose et signale, il ne déclare jamais un son « correct ».
- Priorité des sources pour un mot : correction > graphèmes explicites de la carte > entrée à plusieurs mots (toujours à valider) > ManuLemme > heuristique.
- Statuts d'une correction : `a_valider`, `valide` (JF a confirmé le résultat tel quel), `corrige` (JF l'a modifié ; une raison est obligatoire). Un `valide` ou `corrige` n'est jamais remplacé par un `a_valider`.
- Format d'une correction : `{ mot, cubes: [{ g, son }], statut, auteur, date, raison }` ; `mot` normalisé par `normaliserMot` ; `date` au format `AAAA-MM-JJ` ; `son` = id de `SONS_LILEMO`, `''` (lettre muette), un son composé de `SONS_COMPOSES`, ou une séquence `a+b` d'ids valides (par exemple `e_ouvert+yod`).
- Les graphèmes d'une correction, mis bout à bout (espaces et apostrophes comptent comme des cubes au son vide), recomposent exactement `mot`.
- `data/lexique.json` n'est jamais commité (licence de ManuLemme non vérifiée) ; `data/corrections.json` est commité (travail de validation de JF). Les pages générées dans `revue/` ne sont pas commitées.
- Écriture de `data/corrections.json` atomique (fichier temporaire puis renommage).
- Page de revue : s'ouvre hors ligne en `file://`, aucune ressource externe (ni CDN, ni police en ligne), texte d'au moins 16 px, Arial, contraste suffisant, utilisable au clavier, aucun nom ni donnée d'élève. Chaque champ a un label précis, un placeholder concret et un texte d'aide sous le champ. Consignes à l'infinitif, une action par puce.
- Brouillon de JF dans la page : jamais perdu à la fermeture de l'onglet (sauvegarde locale automatique) ; export explicite par bouton.
- Noms de fonctions et de champs en français, comme dans le moteur existant.

## Review Focus

1. Une correction dont le mot ne se recompose plus avec ses graphèmes, ou dont un son n'existe pas : rejetée avec un message, jamais ignorée en silence ni appliquée (Task 2).
2. Fusion de deux fichiers de corrections pour le même mot : la plus récente gagne, à date égale la nouvelle ; un `a_valider` ne remplace jamais un `valide` ou un `corrige` (Task 2).
3. Entrées à plusieurs mots avec séparateurs variés : « l'ami », « peut-être », « pomme  de terre » (deux espaces), « aujourd'hui » : cubes de séparation, aucune partie vide, toujours à valider (Task 3).
4. Régénération du lexique : un mot `valide` dont le résultat ManuLemme a changé est signalé, pas modifié en silence (Task 5).
5. File de revue de plusieurs centaines de mots : page encore rapide, brouillon conservé au rechargement, sons absents signalés sans plantage (Tasks 7 et 8).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/core/sons.js` (modifié) | renommage `e_muet` en `schwa`, `sonValide`, séquences `a+b` |
| `src/core/corrections.js` | validation, création, fusion des corrections |
| `src/core/lexique.js` (modifié) | `estMultiMot`, priorité des sources dans `segmenterMot` |
| `src/core/liaisons.js`, `analyseListe.js`, `pack.js` (modifiés) | paramètre facultatif `corrections` |
| `src/core/revue.js` | décomposition de codes, file de revue, dérive du lexique |
| `src/node/corrections.js` | lecture et écriture atomique du fichier de corrections |
| `src/revue/page.js` | `construirePageRevue(donnees)` : texte HTML autonome |
| `tools/revue_liste.js`, `tools/importer_corrections.js`, `tools/construire_revue.js` | commandes |
| `docs/recette-revue.md` | parcours de recette pour JF, chemins complets |

---

### Task 1: Renommer `e_muet` en `schwa` et accepter les séquences de sons

**Files:**
- Modify: `src/core/sons.js`, `src/core/codes.js`, `tests/core/codes.test.js`, `tests/core/cubes-lexique.test.js`, `tests/core/parite-html.test.js`, `tests/core/audio.test.js`
- Test: `tests/core/sons.test.js`

**Interfaces:**
- Produces : `SONS_LILEMO` contient `schwa` à la place de `e_muet` (37 ids) ; `VOYELLES_SONS` contient `schwa` ; `SON_PAR_DEFAUT['e'] === 'schwa'` ; `sonDepuisCodes('%') === 'schwa'` ; `composants(son: string|null): string[]` découpe une séquence `a+b` puis décompose chaque partie (`composants('e_ouvert+yod')` = `['e_ouvert','yod']`, `composants('ij')` = `['i','yod']`) ; `sonValide(son: string|null): boolean` (`''` vrai ; id de `SONS_LILEMO` vrai ; clé de `SONS_COMPOSES` vrai ; séquence `a+b` vraie si chaque partie est valide ; `null`, chaîne inconnue ou séquence avec partie vide : faux).

- [ ] **Step 1: Write the failing test** `tests/core/sons.test.js` : `sonValide('')`, `sonValide('schwa')`, `sonValide('ij')`, `sonValide('e_ouvert+yod')`, `sonValide('w+a+yod')` vrais ; `sonValide(null)`, `sonValide('e_muet')`, `sonValide('zz')`, `sonValide('a+')`, `sonValide('+a')`, `sonValide('a+zz')` faux ; `composants('e_ouvert+yod')` égale `['e_ouvert','yod']` ; `composants('i+ij')` égale `['i','i','yod']` ; `sonDepuisCodes('%')` égale `'schwa'` ; `SONS_LILEMO.includes('e_muet')` faux et `SONS_LILEMO.length` égale 37.
- [ ] **Step 2: Run** `node --test tests/core/sons.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** le renommage dans `sons.js` et `codes.js` (la table `CODES` : `%` vers `schwa`), `sonValide`, `composants` étendu. Mettre à jour les tests existants qui citent `e_muet` (`codes`, `cubes-lexique` : se et cerise ; `audio`) et le commentaire de `SONS_LILEMO`. Dans `parite-html.test.js`, remplacer `e_muet` par `schwa` dans la sortie du HTML d'origine avant de comparer (ce HTML garde l'ancien id) et le dire dans un commentaire.
- [ ] **Step 4: Run** `npm test` avec `LILEMO_HTML` posé sur `C:\Users\jfbeg\OneDrive\enseignement\pôle territorial\outils numériques\0 outils PLAI numériques au service de l'enseignant\Lilémo numérique\version phonémique.html` ; attendu : tout passe, aucun test ignoré.
- [ ] **Step 5: Verify** `node tools/rapport_audio.js "<dossier sons du même répertoire>"` : attendu, manquants exactement `eu_ouvert, i, o_ferme, o_ouvert, schwa, yod`.
- [ ] **Step 6: Commit** : `git add . && git commit -m "refactor: e_muet devient schwa, sequences de sons a+b"`.

---

### Task 2: Dictionnaire de corrections : validation, création, fusion

**Files:**
- Create: `src/core/corrections.js`
- Modify: `src/core/index.js`
- Test: `tests/core/corrections.test.js`

**Interfaces:**
- Consumes: `normaliserMot` (lexique.js), `sonValide` (Task 1).
- Produces : `STATUTS: ['a_valider','valide','corrige']` ; `type Correction` (voir Global Constraints) ; `validerCorrection(c: Correction): string[]` (liste d'erreurs en français, vide si valide) ; `type Corrections = { taille: number, liste: Correction[], chercher(mot: string): Correction|null }` ; `creerCorrections(liste: Correction[]): { corrections: Corrections, rejets: { mot: string, erreurs: string[] }[] }` (une correction invalide va dans `rejets`, les autres sont gardées ; doublons de mot : `fusionnerCorrections` appliquée) ; `fusionnerCorrections(existantes: Correction[], nouvelles: Correction[]): Correction[]` (résultat trié par `mot` ; même mot : un `valide` ou `corrige` n'est jamais remplacé par un `a_valider` ; sinon la `date` la plus récente gagne ; à date égale, la nouvelle) ; `corrigeValide(c: Correction|null): boolean` (vrai si statut `valide` ou `corrige`).

Erreurs de `validerCorrection` (texte exact cherché par `includes`) : `mot non normalisé`, `aucun cube`, `graphèmes ne recomposent pas le mot`, `son inconnu : <son>`, `statut inconnu`, `auteur manquant`, `date invalide`, `raison manquante` (statut `corrige` sans raison non vide).

- [ ] **Step 1: Write the failing test** : une correction valide de « soleil » (`s=s, o=o_ferme, l=l, eil=e_ouvert+yod`, statut `corrige`, raison « eil = /ɛj/ ») sans erreur ; un test par erreur ci-dessus ; une correction multi-mots « pomme de terre » avec cubes `pomme`, ` `, `de`, ` `, `terre` (espaces à son vide) valide ; « l'ami » avec le cube `'` à son vide valide ; `creerCorrections` met une correction invalide dans `rejets` avec son message et garde les autres ; `chercher('SOLEIL ')` retrouve la correction (normalisation) ; fusion : `valide` plus ancien contre `a_valider` plus récent donne le `valide` ; `a_valider` ancien contre `corrige` donne le `corrige` ; deux `corrige` : la date la plus récente ; dates égales : la nouvelle ; résultat trié par mot ; `corrigeValide` pour les trois statuts et `null`.
- [ ] **Step 2: Run** `node --test tests/core/corrections.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** selon les signatures ; recomposition : `cubes.map(c => c.g).join('')` normalisé égal à `mot`.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: dictionnaire de corrections (validation, creation, fusion)"`.

---

### Task 3: Priorité des corrections et entrées à plusieurs mots dans `segmenterMot`

**Files:**
- Modify: `src/core/lexique.js`
- Test: `tests/core/priorite.test.js`

**Interfaces:**
- Consumes: `Corrections`, `corrigeValide` (Task 2), `normaliserMot`, `segmenterMot` existant.
- Produces : `estMultiMot(mot: string): boolean` (mot normalisé contenant un espace, une apostrophe `'` ou un trait d'union `-`) ; `segmenterMot(mot, lexique, options?: { graphemes?: string, corrections?: Corrections })` renvoie `source` parmi `'correction'|'explicite'|'multi-mots'|'lexique'|'auto'`.

Règles, dans cet ordre : (1) une correction existe : `source: 'correction'`, cubes de la correction, `aVerifier: statut === 'a_valider'`, `raisons: ['correction <statut> par <auteur>']` ; (2) `options.graphemes` valide : `'explicite'` (inchangé) ; (3) `estMultiMot(m)` : `source: 'multi-mots'`, `aVerifier: true`, raison `entrée à plusieurs mots : à valider`, cubes = découpe sur `/([ '\-])/` en gardant les séparateurs ; chaque partie non vide est segmentée par `segmenterMot(partie, lexique)` (sans corrections de l'entrée entière), chaque séparateur devient le cube `{ g: séparateur, son: '' }`, les parties vides sont ignorées ; (4) lexique ; (5) auto, comme avant.

- [ ] **Step 1: Write the failing test** (fixture `lexique-extrait.json`) : avec une correction `corrige` pour « bien », `segmenterMot('bien', lex, { corrections })` donne `source: 'correction'`, `aVerifier: false`, les cubes de la correction ; la même avec statut `a_valider` donne `aVerifier: true` ; la correction l'emporte sur `options.graphemes` ; sans correction, rien ne change pour « bien » et « chat » ; `estMultiMot` vrai pour `pomme de terre`, `l'ami`, `peut-être`, faux pour `chat` et `''` ; « pomme de terre » donne `source: 'multi-mots'`, `aVerifier: true` et la suite de graphèmes `pomme, ' ', de, ' ', terre` (les parties « de » et « terre » absentes de la fixture passent par l'heuristique, sans exception) ; « pomme  de terre » (deux espaces) donne le même résultat que « pomme de terre » ; « l'ami » donne des cubes dont un `'` à son vide et aucune partie vide ; « -chat » ou « chat- » ne produit pas de cube vide ; une correction `valide` pour « pomme de terre » donne `source: 'correction'`, `aVerifier: false`.
- [ ] **Step 2: Run** `node --test tests/core/priorite.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement.** Ne pas changer le comportement quand `options.corrections` est absent et que le mot n'est pas multi-mots (les tests existants de `lexique.test.js` doivent rester verts ; si l'un d'eux suppose qu'un mot à espace passe par l'heuristique, l'adapter et le ledger en `Ruling:`).
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: priorite des corrections et validation des entrees multi-mots"`.

---

### Task 4: Les corrections traversent les filtres, l'analyse de liste et le pack

**Files:**
- Modify: `src/core/liaisons.js`, `src/core/analyseListe.js`, `src/core/pack.js`
- Test: `tests/core/corrections-propagation.test.js`

**Interfaces:**
- Consumes: `Corrections`, `corrigeValide`, `segmenterMot` (Task 3).
- Produces : `Criteres.corrections?: Corrections` dans `filtrerMots` ; `analyserListe(lignes, lexique, liaisonsConnues?, corrections?)` ; `validerPack(manifest, fichiers, lexique, corrections?)`. Comportement : dans `filtrerMots`, un mot dont la correction est `valide` ou `corrige` utilise les cubes de la correction (ses liaisons peuvent contenir des séquences, par exemple `eil=e_ouvert+yod`) et est proposé même s'il était à vérifier ; un mot avec correction `a_valider`, ou à code inconnu sans correction, reste exclu ; un mot qui n'est que dans les corrections (multi-mots) n'est jamais proposé (ni fréquence ni classe). Dans `analyserListe`, chaque élément de `parMot` gagne `statut: 'a_valider'|'valide'|'corrige'|null` (statut de la correction) et un mot `valide` ou `corrige` sort de `aVerifier`. Dans `validerPack`, un mot multi-mots donne l'avertissement `entrée à plusieurs mots : à valider` sauf correction `valide` ou `corrige` ; l'avertissement `segmentation à vérifier` n'apparaît pas si une correction `valide` ou `corrige` existe.

- [ ] **Step 1: Write the failing test** : « examen » (code `gz`) absent des propositions sans correction, présent avec une correction `corrige` `e_ouvert, x=g+z, a, m, en=in` ; ses liaisons contiennent `x=g+z` ; correction `a_valider` : toujours exclu ; mot multi-mots seulement dans les corrections : absent de `filtrerMots` ; `analyserListe` sur « examen » avec correction `corrige` : `aVerifier` vide et `parMot[0].statut === 'corrige'` ; sans correction : `aVerifier` contient « examen » et `statut === null` ; `validerPack` : carte « pomme de terre » sans correction : avertissement `entrée à plusieurs mots : à valider` ; avec correction `valide` : aucun avertissement de ce type ; carte « zorbalon » avec correction `valide` : pas d'avertissement `segmentation à vérifier`.
- [ ] **Step 2: Run** `node --test tests/core/corrections-propagation.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** en ajoutant un paramètre facultatif ; sans `corrections`, tout le comportement existant est inchangé.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS (tous les tests existants inclus).
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: les corrections traversent filtres, analyse de liste et pack"`.

---

### Task 5: File de revue, propositions de décomposition, dérive du lexique

**Files:**
- Create: `src/core/revue.js`
- Modify: `src/core/index.js`
- Test: `tests/core/revue.test.js`

**Interfaces:**
- Consumes: `cubesDepuisEntree`, `segmenterMot`, `estMultiMot`, `corrigeValide`, `sonDepuisCodes`, `SONS_LILEMO`, `liaisonsDe`.
- Produces :
  - `decomposerCodes(codes: string): string|null` : un code inconnu de `sonDepuisCodes` est décomposé caractère par caractère ; si chaque caractère a un son (hors muet), renvoie la séquence jointe par `+` (`'Ej'` donne `'e_ouvert+yod'`, `'w5'` donne `'w+in'`, `'dZ'` donne `'d+j'`) ; sinon `null` (`'8'` seul, `'G'`, `'A'`).
  - `proposerCubes(entree: EntreeLexique): Cube[]` : comme `cubesDepuisEntree`, mais un cube à son inconnu reçoit `decomposerCodes` s'il existe (le cube garde `aVerifier: true` : c'est une proposition).
  - `type ItemRevue = { mot: string, raisons: string[], cubes: Cube[], freqP1: number, statut: 'a_valider'|null }`.
  - `fileDeRevue(lexique, corrections, options?: { motsSupplementaires?: string[], limite?: number }): ItemRevue[]` : un item par mot qui doit être vu : entrée de lexique avec au moins un code inconnu, entrée de lexique multi-mots, mot de `motsSupplementaires` absent du lexique ou multi-mots ; jamais un mot dont la correction est `valide` ou `corrige` ; un mot à correction `a_valider` reste dans la file avec `statut: 'a_valider'` et les cubes de cette correction ; raisons parmi `code inconnu : <codes>`, `entrée à plusieurs mots : à valider`, `absent du lexique` ; tri par `freqP1` décroissante puis par mot ; `limite` coupe la liste.
  - `deriveDuLexique(corrections, lexique): { mot: string, correction: string[], lexique: string[] }[]` : pour chaque correction `valide`, compare ses liaisons (`liaisonsDe`) à celles du lexique actuel pour ce mot (cubes de `cubesDepuisEntree`, mot trouvé et recomposé) ; ne liste que les différences ; ignore les `corrige` et les mots absents du lexique.

- [ ] **Step 1: Write the failing test** (fixture) : `decomposerCodes` pour `Ej`, `w5`, `dZ`, `ER` donne respectivement `e_ouvert+yod`, `w+in`, `d+j`, `e_ouvert+r` ; pour `8`, `G`, `A`, `''` donne `null` ; `proposerCubes` de l'entrée `zz` (code `A`) laisse `son: null` ; sur une entrée fictive `soleil` (graphèmes `s,o,l,eil`, codes `s,o,l,Ej`) le cube `eil` reçoit `e_ouvert+yod` avec `aVerifier: true` ; `fileDeRevue` sur la fixture sans corrections contient `examen` (raison `code inconnu : gz`) et `zz`, pas `chat` ; avec `motsSupplementaires: ['zorbalon','pomme de terre']` les deux y figurent avec les raisons `absent du lexique` et `entrée à plusieurs mots : à valider` ; une correction `corrige` pour `examen` le retire ; une correction `a_valider` le garde avec `statut: 'a_valider'` ; tri par fréquence et `limite: 1` ; `deriveDuLexique` : une correction `valide` de `chat` identique au lexique ne donne rien ; si ses cubes diffèrent (`ch=s` au lieu de `ch=ch`) elle est listée avec les deux séries de liaisons ; une correction `corrige` n'est jamais listée.
- [ ] **Step 2: Run** `node --test tests/core/revue.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: file de revue, propositions de decomposition, derive du lexique"`.

---

### Task 6: Fichier de corrections sur disque et commandes

**Files:**
- Create: `src/node/corrections.js`, `tools/revue_liste.js`, `tools/importer_corrections.js`, `data/corrections.json` (contenu `[]`)
- Test: `tests/node/corrections-fichier.test.js`

**Interfaces:**
- Consumes: `creerCorrections`, `fusionnerCorrections` (Task 2), `chargerLexique`, `fileDeRevue` (Task 5).
- Produces : `chargerCorrections(chemin: string): Promise<{ corrections: Corrections, rejets: {mot,erreurs}[] }>` (fichier absent : corrections vides ; JSON illisible : lève une erreur au message clair en français) ; `enregistrerCorrections(chemin: string, liste: Correction[]): Promise<void>` (écrit `<chemin>.tmp` puis renomme ; JSON indenté de 1 espace, trié par `mot`, UTF-8) ; `node tools/importer_corrections.js <fichier.json>` fusionne dans `data/corrections.json`, affiche `importées=<n> rejetées=<n>` et chaque rejet avec ses erreurs, n'écrit rien si le fichier importé est illisible ; `node tools/revue_liste.js [--limite N]` charge `data/lexique.json` et `data/corrections.json`, imprime le nombre d'items de la file par raison (`code inconnu`, `plusieurs mots`, `absent`), le nombre de corrections par statut, le nombre de dérives (`deriveDuLexique`), et les 20 premiers mots.

- [ ] **Step 1: Write the failing test** (dossier temporaire) : écrire puis relire une liste de deux corrections renvoie la même liste triée ; fichier absent donne zéro correction sans erreur ; JSON invalide lève une erreur contenant `illisible` ; une correction invalide dans le fichier est dans `rejets` et les valides sont chargées ; `enregistrerCorrections` ne laisse pas de `.tmp` après succès ; l'import d'une correction `a_valider` plus récente n'écrase pas une `corrige` existante (via `fusionnerCorrections`).
- [ ] **Step 2: Run** `node --test tests/node/corrections-fichier.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** les deux fonctions et les deux commandes (`tools/importer_corrections.js` accepte un tableau JSON de corrections).
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Verify sur données réelles** : `node tools/revue_liste.js --limite 20`. Attendu : file de revue d'environ 874 mots à code inconnu (le chiffre exact et le détail sont à rapporter), plus les multi-mots présents dans ManuLemme, 0 correction, 0 dérive ; les mots à code décomposable (soleil, voyage, loin, exercice, hiver, ville) montrent une proposition.
- [ ] **Step 6: Commit** : `git add . && git commit -m "feat: fichier de corrections et commandes de revue"`.

---

### Task 7: Page de revue autonome

**Files:**
- Create: `src/revue/page.js`, `tools/construire_revue.js`
- Modify: `.gitignore` (ajouter `revue/`)
- Test: `tests/revue/page.test.js`

**Interfaces:**
- Consumes: `fileDeRevue`, `SONS_LILEMO`, `SONS_COMPOSES` (Tasks 1 et 5), `chargerLexique`, `chargerCorrections`.
- Produces : `construirePageRevue(donnees: { items: ItemRevue[], sons: string[], dossierSons: string, extension: string, date: string }): string` (document HTML complet) ; `node tools/construire_revue.js --sons "<dossier des sons>" [--limite N] [--ext .wav]` écrit `revue/revue.html` (le dossier `revue/` est créé), avec le chemin du dossier des sons transformé en URL `file:///…` encodée.

Comportement de la page (un mot à la fois) : en-tête « Revue des sons », compteur `12 sur 874`, filtre par raison, tri par fréquence ; pour le mot courant : le mot, ses raisons, un champ **Graphèmes** (placeholder `s-o-l-eil`, aide « Mettre un trait d'union entre les graphèmes ; ils doivent redonner le mot »), une ligne de cubes avec, pour chacun, une liste « Son » (muet, les ids de `SONS_LILEMO`) et une liste facultative « Puis » (pour un second son) ; bouton « Écouter » qui joue les sons dans l'ordre (via `composants`) ; champ **Raison de la correction** (placeholder `eil se prononce comme dans « soleil »`, aide « Obligatoire quand je change quelque chose ») ; champ **Auteur** demandé une fois et mémorisé ; boutons « Valider tel quel » (statut `valide`), « Enregistrer ma correction » (statut `corrige`, raison obligatoire), « Passer » ; « Exporter mes corrections » télécharge `corrections-<date>.json` (tableau de `Correction`). Brouillon et décisions déjà prises sont sauvegardés dans le stockage local à chaque action et restaurés au rechargement. Un son sans fichier ne bloque pas : message « son absent : <id> » à côté du bouton. Si le stockage local est refusé, la page fonctionne sans brouillon et le dit.

- [ ] **Step 1: Write the failing test** `page.test.js` : la chaîne contient `<!doctype html>`, le nombre d'items, le mot du premier item et `Valider tel quel` ; aucune occurrence de `http://` ni `https://` hors du chemin `file:///` éventuel (ressources externes interdites) ; contient les labels `Graphèmes`, `Raison de la correction`, `Auteur` ; chaque `<input>` et `<textarea>` a un `<label for=…>` correspondant ; la police est Arial et aucune taille de texte inférieure à 16px n'apparaît dans le CSS ; les données embarquées se relisent en JSON et égalent `items` ; `</script>` présent dans un mot est neutralisé (un item au mot `a</script>b` ne casse pas la page : la chaîne ne contient qu'un seul `</script>` de fermeture par bloc de script) ; page construite avec zéro item : affiche « Aucun mot à revoir ».
- [ ] **Step 2: Run** `node --test tests/revue/page.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** `construirePageRevue` (HTML, CSS et JavaScript en ligne dans une seule chaîne, données en JSON dans un bloc `<script type="application/json">` avec `<` échappé) et la commande.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: page de revue autonome pour verifier et corriger les sons"`.

---

### Task 8: Parcours réel et recette

**Files:**
- Create: `docs/recette-revue.md`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces : une page `revue/revue.html` réellement ouverte et essayée ; un guide de recette pour JF.

- [ ] **Step 1: Generate** : `node tools/construire_revue.js --sons "C:\Users\jfbeg\OneDrive\enseignement\pôle territorial\outils numériques\0 outils PLAI numériques au service de l'enseignant\Lilémo numérique\sons" --limite 300` ; attendu : `revue/revue.html` créé, taille en Mo rapportée.
- [ ] **Step 2: Open as the user** : ouvrir `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\revue\revue.html` dans le navigateur intégré (URL `file:///C:/Users/jfbeg/OneDrive/claude-workspace/phonoactif/revue/revue.html`), lire la console : attendu, aucune erreur ni requête réseau.
- [ ] **Step 3: Walk the real path** : valider un mot tel quel, corriger un mot décomposable (changer un son avec « Puis », saisir une raison), passer un mot, recharger la page (le brouillon et les décisions reviennent), exporter ; relever pour chaque action le texte à l'écran. Noter ce qui n'a pas pu être vérifié (le son lui-même : seule l'oreille de JF tranche).
- [ ] **Step 4: Import** : `node tools/importer_corrections.js "<fichier exporté>"` puis `node tools/revue_liste.js` : attendu, les deux mots décisions comptés, la file diminuée de 2 ; supprimer ensuite ces deux essais de `data/corrections.json` (remettre `[]`) ; rapporter les sorties exactes.
- [ ] **Step 5: Write** `docs/recette-revue.md` : étapes de recette pour JF avec chemins Windows complets et adresse `file:///` exacte : générer la page, l'ouvrir, revoir 10 mots à l'oreille (cases à cocher : son juste, son faux, son absent), exporter, importer, vérifier le compte ; une section « Ce qui n'est pas vérifié ».
- [ ] **Step 6: Run** `npm test` et `npm run test:py` ; attendu : tout passe.
- [ ] **Step 7: Commit** : `git add docs data && git commit -m "docs: recette de la revue des sons"`.

---

## Self-Review

**Couverture de la spec (section 7, « Corrections et validation »)** : dictionnaire prioritaire sur ManuLemme avec statuts, auteur, date, raison Tasks 2 et 3 ; écran de revue avec écoute, correction, validation Tasks 7 et 8 ; mots signalés (code inconnu, absents, multi-mots) Task 5 ; entrées à plusieurs mots jamais automatiques Task 3 ; mot validé qui survit à la régénération et signalement des dérives Task 5 ; schwa renommé Task 1. **Hors de ce plan** : interface React définitive (la page de revue est provisoire), enregistrement des sons, assignation (HubActif en réserve), tableau de bord.

**Cohérence des types.** `Correction`, `Corrections`, `corrigeValide`, `ItemRevue`, `segmenterMot(..., { corrections })` définis en Tasks 2, 3, 5 et utilisés avec les mêmes noms ensuite. `composants` et `sonValide` (Task 1) servent aux Tasks 2, 5 et 7.

**Proportion.** Signatures, règles et assertions ; aucun corps de fonction écrit.

**Choix de ce plan à confirmer par JF (non décidés par lui) :** page de revue HTML autonome comme écran provisoire plutôt que d'attendre l'interface React ; `data/corrections.json` commité ; propositions de décomposition automatique (`Ej` en `e_ouvert+yod`) toujours marquées « à vérifier » ; `8` seul, `G`, `A` laissés sans proposition ; renommage de `e_muet` en `schwa` (annoncé, sans objection).
