# Socle élève : jeu de construction de mot, packs et journal des essais

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une première app élève utilisable sur tablette : l'élève construit un mot avec des cubes (graphèmes) à partir d'une carte (avec ou sans le mot), en habillage « album » (P1 à P3) ou « sobre » (P4 et au-delà), et chaque essai est enregistré sur l'appareil, prêt à nourrir le futur tableau de bord.

**Architecture:** Le moteur existant (`src/core/`) reste la source de vérité. Un pack jouable embarque, pour chaque carte, les cubes déjà calculés (graphèmes et sons) : l'app élève ne contient jamais ManuLemme. La logique de jeu et le journal des essais sont des fonctions pures testées dans Node. L'interface est une petite app React/Vite qui n'en est que l'habillage. Rien n'est envoyé nulle part : les essais restent sur l'appareil et s'exportent en fichier.

**Tech Stack:** Node 24 (`node:test`) pour la logique ; React 18, Vite 5, Vitest, Testing Library et jsdom pour l'interface ; CSS par variables (pas de Tailwind, voir Global Constraints).

**Spec:** `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\docs\superpowers\specs\2026-11-11-lilemo-numerique-design.md` (sections 3, 6, 8, 9, « Habillage ») et `docs/design/habillages-a1-m1.css`. Racine du code : `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\`.

## Global Constraints

- Aucune IA. Aucun appel réseau, aucun Supabase, aucune clé dans l'app. HubActif reste en réserve.
- `data/lexique.json` et ManuLemme n'entrent jamais dans l'app ni dans un pack : un pack ne contient que les cubes de ses propres mots. Licence de ManuLemme non vérifiée : ce point est à signaler à JF avant toute diffusion d'un pack.
- Élève identifié par un code anonyme (lettres, chiffres, tiret ; 1 à 12 caractères), jamais par un nom ; le code ne quitte pas l'appareil. Le champ explique : « Un code, pas un nom ».
- Accessibilité : texte d'au moins 16 px ; mots à lire en Arial ; tap comme interaction principale (le glisser-déposer n'est pas dans cette version) ; aucun chrono visible ; aucun score affiché à l'élève ni aux autres ; aucune animation parasite ; bouton « Écouter » toujours disponible.
- Aucune erreur technique montrée à l'élève : son absent, stockage refusé, image manquante restent silencieux côté élève et sont signalés à l'enseignant sur l'écran d'accueil.
- Habillages : `data-habillage="album"` et `data-habillage="sobre"`, variables de `docs/design/habillages-a1-m1.css` (copiées dans l'app). Pas de Tailwind : l'habillage est entièrement piloté par des variables CSS.
- Branding PLAI sur l'écran d'accueil seulement (navigation, conteneur, pied de page) : `shared/css/plai-style.css` et `plai-logo.jpg` du workspace, logo à hauteur fixe (32 px en navigation, 40 px en pied de page) et largeur automatique (ratio 2,56). Le jeu lui-même reste épuré.
- Le journal d'un essai n'enregistre ni la durée ni le temps de réponse (non décidé par JF).
- `public/sons/` et `public/packs/` ne sont jamais commités (voix de bibliothèque et images : licences non vérifiées). Rien n'est déployé ni poussé sans accord de JF ; `npx vite build` doit passer avant tout push futur.
- Les essais et réglages restent du texte en français ; identifiants de code en français comme dans le moteur.

## Review Focus

1. Carte à graphème répété (« été » : é, t, é) ou à lettre muette (le t de « chat ») : le plateau contient une pièce par graphème, muettes comprises, et la vérification est exacte (Task 2).
2. Gestes rapides : deux taps sur la même pièce, tap quand la zone est pleine, « Vérifier » sur une zone incomplète : aucun essai enregistré à tort, jamais d'exception (Tasks 2 et 6).
3. Sons absents ou lecture audio bloquée par le navigateur : la partie continue, sans message pour l'élève (Task 6).
4. Stockage local refusé ou plein : le jeu fonctionne, les essais restent en mémoire, l'enseignant est averti et peut exporter (Tasks 3 et 6).
5. Code élève vide, trop long, avec espaces ou accents ; pack introuvable ou manifeste invalide ; adresse de carte inconnue : message clair à l'enseignant, pas d'écran blanc (Tasks 4 et 6).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/core/pack.js` (modifié) | cubes dans le manifeste, adresses de cartes, validation d'un pack jouable |
| `src/jeu/plateau.js` | construction du plateau (pièces, intrus) |
| `src/jeu/session.js` | état du jeu : poser, retirer, vérifier, aide graduée, essais |
| `src/jeu/essais.js` | journal des essais, stockage, export, résumé par liaison |
| `src/app/route.js` | lecture et écriture des adresses de tâche et de carte |
| `src/app/` (nouveau) | `main.jsx`, `App.jsx`, `Accueil.jsx`, `Jeu.jsx`, `Bilan.jsx`, `audio.js`, `chargerPack.js`, `habillages.css`, `jeu.css` |
| `index.html`, `vite.config.js` | point d'entrée Vite |
| `tools/pack_demo.js`, `tools/copier_sons.js` | pack d'essai aux images provisoires ; copie des sons validés |
| `tests/jeu/`, `tests/app/` | tests Node et Vitest |
| `docs/recette-eleve.md` | recette pour JF, chemins complets |

---

### Task 1: Pack jouable : cubes, adresses de cartes, validation

**Files:**
- Modify: `src/core/pack.js`, `tools/preparer_pack.js`
- Test: `tests/core/pack-jouable.test.js`

**Interfaces:**
- Consumes: `preparerPack`, `validerPack`, `segmenterMot`, `sonValide`, `composants`, `Manifest`, `Carte` (existants).
- Produces :
  - `Carte.cubes?: { g: string, son: string }[]` : `preparerPack` le renseigne pour chaque carte avec les cubes de `segmenterMot(mot, lexique, { corrections })` ; un cube au son inconnu garde `son: null` (le pack n'est alors pas jouable) ; la carte garde `aVerifier: boolean`.
  - `preparerPack(params)` accepte `baseUrl?: string` : le CSV gagne la colonne `adresse de la carte` (fin de ligne) valant `<baseUrl>#/carte/<nom du pack>/<id>` ; sans `baseUrl`, colonne vide.
  - `validerPackJouable(manifest: Manifest, fichiers: Set<string>, sonsDisponibles: Set<string>): { erreurs: string[], avertissements: string[] }` : les erreurs de `validerPack` (hors avertissement de segmentation), plus, par carte : `cubes manquants`, `cube sans son : <g>` (son `null`), `son invalide : <son>`, `les cubes ne recomposent pas le mot`, `carte à vérifier : passer par la revue` quand `aVerifier` est vrai ; avertissements `son sans fichier : <id>` pour chaque id de `composants` absent de `sonsDisponibles`, au plus un avertissement par id et par pack.
  - `tools/preparer_pack.js` : option `--base-url <url>` ; écrit aussi `packs/<nom>/manifest.json` avec les cubes ; imprime le nombre de cartes à vérifier.

- [ ] **Step 1: Write the failing test** (fixture `lexique-extrait.json`) : `preparerPack` sur `chat` et `lune` : cubes de `chat` égaux à `ch=ch, a=a, t=''` ; `zorbalon` (absent) : `aVerifier: true` ; `examen` : un cube `son: null` ; CSV avec `baseUrl: 'https://exemple.test/'` : dernière colonne `https://exemple.test/#/carte/essai/chat` et en-tête terminé par `;adresse de la carte` ; sans `baseUrl` : dernière colonne vide ; `validerPackJouable` d'un pack `chat`+`lune` avec fichiers et sons `ch, a, l, u, n` présents : aucun message ; son `a` absent : avertissement `son sans fichier : a` une seule fois même si deux cartes l'utilisent ; carte `examen` : erreurs `cube sans son : x` et `carte à vérifier : passer par la revue` ; carte aux cubes qui ne recomposent pas : erreur ; carte sans `cubes` : `cubes manquants` ; cube `son: 'zz'` : `son invalide : zz`.
- [ ] **Step 2: Run** `node --test tests/core/pack-jouable.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** ; les tests existants de `preparerPack` et `validerPack` restent verts (le CSV garde ses colonnes dans l'ordre, la nouvelle est ajoutée à la fin ; adapter l'attendu exact des tests existants du CSV et le noter en `Ruling:`).
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: pack jouable avec cubes et adresses de cartes"`.

---

### Task 2: Plateau et session de jeu (logique pure)

**Files:**
- Create: `src/jeu/plateau.js`, `src/jeu/session.js`
- Test: `tests/jeu/plateau.test.js`, `tests/jeu/session.test.js`

**Interfaces:**
- Consumes: `choisirIntrus`, `reponseJuste`, `composants`, `liaisonsDe`.
- Produces :
  - `type PositionEssai = { liaison: string, pose: string|null, juste: boolean }` ; `type LigneEssai = { session: string, code: string, pack: string, carte: string, mot: string, modeMot: 'avec'|'sans', tentative: number, juste: boolean, aide: 'aucune'|'ecoute'|'indice'|'revelation', positions: PositionEssai[], date: string }` (aucune durée) : `verifier` produit ces lignes, la date vient de l'horloge injectée ; la Task 3 en ajoute le stockage et l'export.
  - `type Piece = { id: string, g: string, son: string, intrus: boolean }`.
  - `construirePlateau(carte: Carte, options?: { nbIntrus?: number /* défaut 3 */, rng?: () => number }): Piece[]` : une pièce par cube de `carte.cubes` (muettes et répétitions comprises) plus `nbIntrus` intrus issus de `choisirIntrus`, mélangés (Fisher-Yates avec `rng`) ; ids stables `p0`, `p1`… dans l'ordre de création avant mélange.
  - `type Reglages = { modeMot: 'avec'|'sans', habillage: 'album'|'sobre', nbIntrus: number, exigerAccents: boolean, essaisMax: number /* défaut 3 */ }`.
  - `type Etat = { pack: string, code: string, session: string, cartes: Carte[], index: number, plateau: Piece[], poses: string[] /* ids de pièces dans l'ordre */, tentative: number, aide: 'aucune'|'ecoute'|'indice'|'revelation', statut: 'en_cours'|'juste'|'revelation'|'fini', reglages: Reglages, essais: LigneEssai[] }`.
  - `demarrerJeu(params: { pack: { nom: string, cartes: Carte[] }, reglages: Reglages, code: string, session?: string, rng?: () => number, maintenant?: () => string }): Etat` : cartes dans l'ordre du pack (ou mélangées si `rng` fourni et `reglages.melanger` vrai) ; session par défaut `s-<date compacte>-<4 caractères>` ; premier plateau construit.
  - `poser(etat: Etat, pieceId: string): Etat` : ignore (renvoie l'état identique) si le statut n'est pas `en_cours`, si la pièce est déjà posée, inconnue, ou si la zone est pleine (autant de poses que de cubes).
  - `retirer(etat: Etat): Etat` (retire la dernière pose ; rien à retirer : état identique) ; `vider(etat: Etat): Etat`.
  - `verifier(etat: Etat): { etat: Etat, resultat: 'incomplet'|'juste'|'faux'|'revelation' }` : zone incomplète : `incomplet`, état et essais inchangés ; sinon compare avec `reponseJuste(graphèmes posés, graphèmes attendus, reglages.exigerAccents)` ; ajoute une `LigneEssai` (Task 3) à `essais` ; juste : statut `juste` ; faux : `tentative` + 1, zone vidée, et si `tentative` atteint `essaisMax` : statut `revelation`.
  - `aider(etat: Etat): { etat: Etat, sons: string[] }` : niveau suivant parmi `ecoute` (rejoue les sons du mot : `composants` de chaque cube), `indice` (l'`indice` expose le graphème attendu à la première position non correcte via `etat.indice`), `revelation` (statut `revelation`) ; `sons` = ids à jouer (vide hors `ecoute`).
  - `suivant(etat: Etat): Etat` : carte suivante (plateau neuf, poses vides, tentative 1, aide `aucune`, statut `en_cours`) ou statut `fini` après la dernière ; ignoré tant que le statut est `en_cours`.
  - `sonsDuMot(carte: Carte): string[]` : ids joués pour « Écouter » (concaténation des `composants` des cubes, sans doublon consécutif exigé : l'ordre du mot est conservé).

- [ ] **Step 1: Write the failing tests** : plateau : `chat` donne 3 pièces cube plus 3 intrus ; `été` (é, t, é) donne deux pièces `é` aux ids différents ; un intrus n'est jamais un graphème du mot ni le miroir d'une de ses lettres (règle existante) ; `nbIntrus: 0` donne seulement les pièces du mot ; mélange reproductible avec `rng` fixé et différent avec un autre ; ids stables. Session (carte `chat`, `rng` fixé) : poser dans le bon ordre puis `verifier` donne `juste`, une ligne d'essai `tentative: 1`, `juste: true`, des `positions` alignées sur les cubes (`ch=ch` posé `ch` juste, etc.), une `date` ISO fournie par l'horloge injectée et aucun champ de durée ; poser la même pièce deux fois : état inchangé ; poser quand la zone est pleine : inchangé ; `verifier` à zone incomplète : `incomplet`, `essais` vide ; mauvaise réponse : `faux`, zone vidée, `tentative` 2, ligne `juste: false` ; trois mauvaises réponses : `revelation` et trois lignes ; `exigerAccents: false` accepte `e` pour `é` (carte `été`) ; `retirer` puis re-poser ; `retirer` sans rien posé : état identique ; `aider` : `ecoute` (sons de `chat` : `ch`, `a`) puis `indice` puis `revelation` ; `suivant` ignoré en cours, avance après `juste`, devient `fini` après la dernière carte ; un état n'est jamais modifié en place (comparer l'objet d'origine avant et après).
- [ ] **Step 2: Run** `node --test tests/jeu/plateau.test.js tests/jeu/session.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement.** Toutes les fonctions renvoient un nouvel état ; l'horloge et le hasard sont injectables.
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: plateau et session de jeu"`.

---

### Task 3: Journal des essais, stockage, export, résumé par liaison

**Files:**
- Create: `src/jeu/essais.js`
- Test: `tests/jeu/essais.test.js`

**Interfaces:**
- Consumes: `LigneEssai` et `PositionEssai` (Task 2).
- Produces :
  - `type StockageEssais = { ajouter(ligne: LigneEssai): void, lire(): LigneEssai[], vider(): void, persistant: boolean }`.
  - `stockageMemoire(): StockageEssais` ; `stockageLocal(options?: { cle?: string /* défaut 'phonoactif-essais-v1' */, storage?: Storage }): StockageEssais` : lit et écrit du JSON dans `storage` ; si l'accès lève une exception ou si le contenu est illisible, bascule sur la mémoire avec `persistant: false` et ne lève jamais.
  - `exporterJson(lignes: LigneEssai[]): string` (indenté d'un espace) ; `exporterCsv(lignes: LigneEssai[]): string` (BOM, séparateur `;`, retours `\r\n`, en-tête `date;code;pack;carte;mot;mode;tentative;juste;aide;positions`, `positions` = `liaison:pose:ok|ko` jointes par `|`).
  - `resumerParLiaison(lignes: LigneEssai[]): { liaison: string, essais: number, justesDuPremierCoup: number, reprises: number, confusions: Record<string, number> }[]` : pour chaque position des lignes `tentative === 1`, `essais` + 1 et `justesDuPremierCoup` + 1 si juste ; pour les tentatives suivantes, `reprises` + 1 par position ; `confusions[pose]` + 1 pour toute position fausse avec `pose` non nul ; trié par liaison ; mêmes liaisons comparées par chaînes exactes.

- [ ] **Step 1: Write the failing test** : stockage mémoire : ajouter, lire (copie, pas la référence interne), vider ; `stockageLocal` avec un faux `Storage` : écrit sous la clé, relit au second appel ; faux `Storage` dont `setItem` lève : `persistant: false`, `ajouter` et `lire` fonctionnent en mémoire ; contenu illisible : repart de zéro sans exception ; `exporterJson` se relit identique ; `exporterCsv` : BOM, en-tête exact, une ligne par essai, `positions` sous la forme `ch=ch:ch:ok|a=a:o:ko` ; `resumerParLiaison` : trois lignes (réussite au premier coup, échec puis réussite, confusion `ch` posé pour `s=s`) donnent les compteurs exacts, `reprises` comptées à part, confusions par pose ; liste vide : tableau vide.
- [ ] **Step 2: Run** `node --test tests/jeu/essais.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: journal des essais, stockage local, export, resume par liaison"`.

---

### Task 4: Adresses de tâche et de carte

**Files:**
- Create: `src/app/route.js`
- Test: `tests/app/route.test.js`

**Interfaces:**
- Produces :
  - `type Tache = { pack: string, modeMot: 'avec'|'sans', habillage: 'album'|'sobre', nbIntrus: number, exigerAccents: boolean }`.
  - `lireAdresse(hash: string): { ecran: 'accueil'|'jeu'|'carte'|'inconnue', tache?: Partial<Tache>, carte?: string }` : `''` ou `#/` donne `accueil` ; `#/jeu?pack=p2&mode=sans&habillage=album&intrus=3&accents=1` donne `jeu` ; `#/carte/<pack>/<id>?mode=avec` donne `carte` avec `tache.pack` et `carte` ; valeurs hors liste (`mode=xx`, `intrus=-1`, `habillage=rose`) ignorées (champ absent du résultat) ; tout le reste : `inconnue`.
  - `ecrireAdresse(base: string, ecran: 'jeu'|'carte', tache: Tache, carte?: string): string` : adresse complète `<base>#/jeu?…` ou `<base>#/carte/<pack>/<id>?…`, valeurs encodées par `encodeURIComponent`.
  - `REGLAGES_PAR_DEFAUT: Reglages` : `modeMot: 'sans'`, `habillage: 'album'`, `nbIntrus: 3`, `exigerAccents: false`, `essaisMax: 3`.

- [ ] **Step 1: Write the failing test** : aller-retour `ecrireAdresse` puis `lireAdresse` pour `jeu` et `carte` sur un pack au nom accentué (`été`) ; chaque valeur invalide ignorée ; hash vide et `#/` ; `#/n-importe-quoi` donne `inconnue` ; `#/carte/p2` (identifiant manquant) donne `inconnue` ; paramètres dans le désordre acceptés ; `base` se terminant ou non par `/` donne la même adresse.
- [ ] **Step 2: Run** `node --test tests/app/route.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: adresses de tache et de carte (liens et QR)"`.

---

### Task 5: Squelette de l'app, chargement d'un pack, pack d'essai

**Files:**
- Create: `index.html`, `vite.config.js`, `src/app/main.jsx`, `src/app/App.jsx`, `src/app/chargerPack.js`, `src/app/audio.js`, `tools/pack_demo.js`, `tools/copier_sons.js`, `src/app/plai.css` (copie de `shared/css/plai-style.css`), `public/plai-logo.jpg` (copie de `C:\Users\jfbeg\OneDrive\claude-workspace\projets\portail-plai\public\plai-logo.jpg`)
- Modify: `package.json` (dépendances et scripts `dev`, `build`, `preview`, `test:ui`), `.gitignore` (`public/sons/`, `public/packs/`, `dist/`), `C:\Users\jfbeg\OneDrive\claude-workspace\.claude\launch.json` (entrée `phonoactif-app`)
- Test: `tests/app/chargerPack.test.js`

**Interfaces:**
- Consumes: `validerPackJouable` (Task 1), `lireAdresse` (Task 4).
- Produces :
  - `chargerPack(nom: string, options?: { base?: string, fetch?: typeof fetch, sonsDisponibles?: Set<string> }): Promise<{ pack: { nom, cartes }, avertissements: string[] }>` : lit `<base>packs/<nom>/manifest.json` (base par défaut `/`), valide avec `validerPackJouable` (fichiers = noms d'images déclarés, supposés présents ; l'image manquante se détecte à l'affichage, voir Task 6) ; manifeste introuvable, illisible ou invalide : lève une `Error` au message en français (`pack « x » introuvable`, `pack « x » invalide : <première erreur>`).
  - `jouerSons(ids: string[], options?: { base?: string, extension?: string, creerAudio?: (url: string) => HTMLAudioElement }): Promise<{ manquants: string[] }>` : joue les sons dans l'ordre (`/sons/<id>.wav` par défaut), ne lève jamais (un son absent ou un refus de lecture va dans `manquants`) ; un nouvel appel interrompt le précédent.
  - `node tools/pack_demo.js` : écrit `public/packs/demo/manifest.json` (6 cartes : chat, lune, pain, maman, vache, sac, cubes issus du lexique réel, `source` « pack d'essai », `licence` « propre ») et deux images SVG provisoires par carte (`<id>.svg` sans mot, `<id>-mot.svg` avec le mot en Arial).
  - `node tools/copier_sons.js "<dossier des sons>"` : copie les `.wav` vers `public/sons/` et imprime le nombre de fichiers.
  - `npm run dev` lance Vite sur le port 5199 ; entrée `phonoactif-app` de `launch.json` : `runtimeExecutable: node`, `runtimeArgs: ["C:\\Users\\jfbeg\\OneDrive\\claude-workspace\\phonoactif\\node_modules\\vite\\bin\\vite.js", "C:\\Users\\jfbeg\\OneDrive\\claude-workspace\\phonoactif", "--port", "5199"]`, `port: 5199`.

- [ ] **Step 1: Write the failing test** (`chargerPack.test.js`, `fetch` simulé) : manifeste valide chargé ; 404 : erreur `pack « x » introuvable` ; JSON invalide : erreur `invalide` ; manifeste valide mais carte sans cubes : erreur `pack « x » invalide : …cubes manquants` ; avertissement `son sans fichier : a` rendu quand `sonsDisponibles` ne le contient pas ; `jouerSons` avec un faux `creerAudio` dont `play()` rejette : renvoie `manquants` sans lever ; son dont `onerror` se déclenche : dans `manquants` ; tableau vide : résolu immédiatement ; deux appels successifs : le premier est interrompu (ses sons suivants ne sont plus joués).
- [ ] **Step 2: Run** `node --test tests/app/chargerPack.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** ; installer `react@18`, `react-dom@18`, `vite@5`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` ; `App.jsx` ne montre pour l'instant que le titre « PhonoActif » et l'écran résolu par `lireAdresse`.
- [ ] **Step 4: Run** `npm test`, puis `npx vite build` ; attendu : PASS et build sans erreur.
- [ ] **Step 5: Generate** : `node tools/pack_demo.js` puis `node tools/copier_sons.js "C:\Users\jfbeg\OneDrive\enseignement\pôle territorial\outils numériques\0 outils PLAI numériques au service de l'enseignant\Lilémo numérique\sons"` ; attendu : 6 cartes et 31 fichiers ; ouvrir `preview_start` sur `phonoactif-app` et lire la console : aucune erreur.
- [ ] **Step 6: Commit** : `git add . && git commit -m "feat: squelette de l'app eleve, chargement de pack, pack d'essai"`.

---

### Task 6: Écrans Accueil, Jeu et Bilan

**Files:**
- Create: `src/app/Accueil.jsx`, `src/app/Jeu.jsx`, `src/app/Bilan.jsx`, `src/app/jeu.css`
- Modify: `src/app/App.jsx`
- Test: `tests/app/ecrans.test.jsx` (Vitest, jsdom)

**Interfaces:**
- Consumes: `demarrerJeu`, `poser`, `retirer`, `vider`, `verifier`, `aider`, `suivant`, `sonsDuMot` (Task 2), `stockageLocal`, `exporterJson`, `exporterCsv`, `resumerParLiaison` (Task 3), `lireAdresse`, `ecrireAdresse`, `REGLAGES_PAR_DEFAUT` (Task 4), `chargerPack`, `jouerSons` (Task 5).
- Produces :
  - **Accueil** : champ **Code de l'élève** (label précis, placeholder `E07`, aide « Un code, pas un nom. Lettres, chiffres et tiret, 12 au plus. Il reste sur cet appareil. ») ; sélecteur **Pack** (nom lu dans l'adresse ou saisi) ; réglages enseignant : **Cartes avec le mot / sans le mot**, **Habillage album / sobre**, **Nombre d'intrus** (0 à 5), **Exiger les accents** ; bouton « Commencer » désactivé tant que le code est invalide (`/^[A-Za-z0-9-]{1,12}$/`) ; zone **Enseignant** : lien copiable de la tâche (`ecrireAdresse`), avertissements du pack (sons sans fichier), avertissement « Les essais ne sont pas conservés sur cet appareil » quand `stockage.persistant` est faux, boutons « Exporter les essais (JSON) » et « Exporter les essais (CSV) » ; navigation et pied de page PLAI (branding vérifié à l'écran).
  - **Jeu** : carte (image sans mot, ou image avec mot si `modeMot: 'avec'`, texte alternatif = le mot), zone de construction, plateau de pièces (tap pour poser, tap sur la dernière posée ou bouton « Retirer » pour retirer, « Tout effacer »), « Écouter » (joue `sonsDuMot`), tap sur une pièce du plateau joue aussi son son, « Vérifier », « Besoin d'aide ? » (`aider`), retour à la carte suivante par « Suivant » après `juste` ou `revelation` ; le mot attendu s'affiche en cas de `revelation` ; chaque vérification enregistre la ligne d'essai dans le stockage ; consignes à l'infinitif, une action par puce ; aucun chrono, aucun score ; image introuvable : la carte s'affiche avec le mot écrit et l'enseignant est averti sur l'accueil au prochain retour.
  - **Bilan** : fin de pack sans score : « Pack terminé », nombre de cartes vues, bouton « Rejouer » et « Retour à l'accueil ».
  - Adresse `#/carte/<pack>/<id>` : une seule carte du pack, avec la demande du code d'abord ; carte inconnue : message « Cette carte n'existe pas dans ce pack » et retour à l'accueil.

- [ ] **Step 1: Write the failing tests** (pack minimal en mémoire, `fetch` et audio simulés, faux `Storage`) : accueil : « Commencer » désactivé avec code vide, `E 07`, `Étienne` (accent), 13 caractères ; activé avec `E07` ; le texte d'aide du code est présent ; le lien de tâche reflète les réglages ; jeu `chat` : taps `ch`, `a`, `t` puis « Vérifier » affiche une réponse juste, « Suivant » apparaît et une ligne d'essai est enregistrée ; « Vérifier » à zone incomplète n'enregistre rien et dit quoi faire ; mauvaise réponse : zone vidée, message d'encouragement sans score ; troisième échec : le mot attendu s'affiche ; tap deux fois sur la même pièce : pas de doublon ; mode `avec` montre l'image avec mot, mode `sans` l'image sans mot ; son absent (faux audio qui échoue) : aucun message d'erreur dans l'écran élève ; `Storage` qui lève : le jeu continue, l'accueil affiche l'avertissement ; pack introuvable : message clair, pas d'exception non gérée ; adresse de carte inconnue : message attendu ; l'élément racine porte `data-habillage` égal au réglage.
- [ ] **Step 2: Run** `npx vitest run tests/app/ecrans.test.jsx` ; attendu : FAIL.
- [ ] **Step 3: Implement** ; l'état de jeu vient des fonctions pures de la Task 2 ; aucun hasard ni horloge dans les composants hors des injections de `demarrerJeu`.
- [ ] **Step 4: Run** `npm test`, `npx vitest run` et `npx vite build` ; attendu : tout passe.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: ecrans accueil, jeu et bilan"`.

---

### Task 7: Habillages A1 et M1, vérification à l'écran, recette

**Files:**
- Create: `src/app/habillages.css` (variables de `docs/design/habillages-a1-m1.css`), `docs/recette-eleve.md`
- Modify: `src/app/jeu.css`, `src/app/main.jsx`
- Test: `tests/app/habillage.test.jsx`

**Interfaces:**
- Consumes: écrans de la Task 6.
- Produces : styles du jeu écrits uniquement avec les variables d'habillage (`--fond`, `--ecran`, `--bord`, `--rayon`, `--v`, `--c`, `--m`, `--btn`, `--carte-fond`, etc.) ; cubes colorés selon la classe du son (`classeCube` : voyelle, consonne, muet) ; carte physique et écran partagent cadre et palette (lien avec la version physique).

- [ ] **Step 1: Write the failing test** (`habillage.test.jsx`) : l'écran de jeu rendu avec `habillage: 'album'` puis `'sobre'` porte l'attribut `data-habillage` correspondant ; aucune règle de `jeu.css` ni de `habillages.css` ne déclare une `font-size` inférieure à 16 px (analyse du texte du CSS) ; `jeu.css` ne contient aucune couleur écrite en dur hors de `habillages.css` (recherche de `#` dans `jeu.css` : aucune occurrence) ; les mots à lire (zone de construction, carte avec mot) utilisent `font-family: Arial` ; aucun `animation` ni `transition` supérieur à 200 ms dans le CSS.
- [ ] **Step 2: Run** `npx vitest run tests/app/habillage.test.jsx` ; attendu : FAIL.
- [ ] **Step 3: Implement** les deux habillages sur l'écran de jeu et l'accueil.
- [ ] **Step 4: Verify à l'écran** : `preview_start` sur `phonoactif-app`, ouvrir `http://localhost:5199/#/jeu?pack=demo&mode=sans&habillage=album` puis `habillage=sobre`, jouer une carte entière au clic (poser les pièces, vérifier, suivant), faire une erreur volontaire, lire la console et le réseau (aucune requête externe) ; vérifier les deux habillages en largeur mobile (`resize_window` 375 px) et tablette (768 px) ; prendre une capture de chaque habillage. Dire ce qui n'est pas vérifiable (le son entendu, le toucher réel sur tablette).
- [ ] **Step 5: Write** `docs/recette-eleve.md` : étapes de recette pour JF avec chemins complets et adresses exactes (lancer `npm run dev`, ouvrir `http://localhost:5199/#/jeu?pack=demo&mode=sans&habillage=album`), jouer 3 cartes, tester le tap sur tablette, tester un élève en panne de son, exporter les essais et ouvrir le CSV dans Excel ; cases à cocher ; section « Ce qui n'est pas vérifié ».
- [ ] **Step 6: Run** `npm test`, `npx vitest run`, `npx vite build` ; attendu : tout passe.
- [ ] **Step 7: Commit** : `git add . && git commit -m "feat: habillages album et sobre, recette eleve"`.

---

## Self-Review

**Couverture.** Pack jouable aux cubes précalculés, sans ManuLemme Task 1 ; mode Cubes, avec ou sans mot, aide graduée Task 2 ; enregistrement des essais au niveau de la liaison graphème-son, prêt pour le tableau de bord Tasks 2 et 3 ; adresse par tâche et par carte pour lien, QR ou NFC (lien avec la version physique) Tasks 1 et 4 ; écrans et accessibilité Task 6 ; habillages A1 et M1 Task 7. **Hors de ce plan** : tableau de bord, groupes et assignation (HubActif en réserve), Supabase et comptes, glisser-déposer, mémo et autres jeux, voix de mots entiers, mode « bouche », relevé pour intervenant, déploiement.

**Cohérence des types.** `Carte.cubes`, `Piece`, `Reglages`, `Etat`, `LigneEssai` (Task 2), `StockageEssais` (Task 3), `Tache` (Task 4) définis une fois et utilisés avec les mêmes noms ensuite.

**Proportion.** Signatures, règles et assertions ; aucun corps de fonction écrit.

**Choix de ce plan à confirmer par JF (non décidés par lui) :** pas de Tailwind ; tap seulement (pas de glisser-déposer) dans cette version ; essais gardés sur l'appareil avec export JSON et CSV, en attendant le tableau de bord et un serveur ; lien de tâche et adresse de carte encodés dans l'adresse web ; sons des mots obtenus en enchaînant les sons des graphèmes (pas de voix de mot entier) ; code élève limité à 12 caractères sans espace ni accent ; aucune durée enregistrée.
