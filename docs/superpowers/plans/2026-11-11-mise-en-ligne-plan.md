# PhonoActif en ligne, version minimale : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire fonctionner de bout en bout la chaîne ordinateur, GitHub, Vercel, Supabase : un enseignant se connecte, crée une classe, des codes d'élèves et une tâche (lien ou QR) ; l'élève joue sur sa tablette et envoie ses essais en fin de séance ; l'enseignant lit la liste des résultats.

**Architecture:** Une app statique (Vite, déjà construite) hébergée sur Vercel, qui parle directement à Supabase. Les enseignants passent par l'authentification Supabase et des politiques d'accès par ligne. L'élève n'a pas de compte : il n'écrit que par deux fonctions SQL contrôlées (lire une tâche, envoyer des essais) qui vérifient le jeton du lien. Aucun serveur à écrire.

**Tech Stack:** Supabase (projet partagé `dfoaumjleqtxjeaplnna`, tables `phono_*`), `@supabase/supabase-js` v2, PGlite pour valider le SQL hors base, Vite/React existants, Node `node:test` et Vitest.

**Spec:** `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\docs\superpowers\specs\2026-11-11-lilemo-numerique-design.md` (section 11 bis, décisions 1 à 19). Racine du code : `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\`.

## Global Constraints

- **Aucune action irréversible ou extérieure sans l'accord explicite de JF, à chaque fois** : création du dépôt GitHub, push, création du projet Vercel et de ses variables, application d'une migration sur Supabase, modification des URL de redirection de l'authentification, DNS du sous-domaine. Chaque tâche concernée contient une étape « ARRÊT : demander l'accord de JF » ; l'exécutant n'avance pas sans réponse écrite.
- Toute table, fonction ou index est préfixé `phono_`. La table `profiles` et son déclencheur existent déjà : ne pas les recréer. Avant tout `create table`, rechercher les conflits : `grep -rIn "create table" --include=*.sql --exclude-dir=node_modules .` depuis `C:\Users\jfbeg\OneDrive\claude-workspace`.
- Chaque `create table` est suivi, dans la même migration, des `grant` Data API nécessaires (`select`/`insert`/`update`/`delete` aux seuls rôles voulus ; jamais à `anon` sur une table).
- RLS activé sur toutes les tables. Les politiques n'utilisent jamais un `exists` qui relit la même table : elles passent par des fonctions `security definer` (incident réel du 2026-09-23).
- Aucune clé secrète dans le dépôt ni dans le navigateur : seule la clé publique `anon` et l'adresse du projet vont dans `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (variables Vercel). La clé `service_role` n'est jamais utilisée par l'app.
- Un élève n'a pas de compte et n'accède à rien d'autre qu'aux deux fonctions `phono_lire_tache` et `phono_envoyer_essais`, par un jeton de tâche.
- Rôles de classe : `master` (créateur : invite, supprime élèves et classe) et `invite` (tout le reste, y compris créer des codes et des tâches, lire tous les résultats). Un enseignant ne voit que les classes dont il est membre.
- Un code d'élève est unique dans sa classe (`unique (class_id, code)`), pas dans le système.
- Le détail de chaque essai est conservé (positions, graphème posé, juste ou faux) ; aucune durée ; aucun nom d'élève ; le code ne sert qu'à relier.
- Tout SQL est écrit sans commentaire `--` dans les fichiers à coller dans l'éditeur Supabase (un tiret peut être perdu au collage), et validé dans PGlite avant d'être proposé à JF.
- Texte de l'interface enseignant : étiquette précise, exemple concret en placeholder, aide sous le champ ; 16 px au moins ; Arial.
- Rien n'est poussé sans que `npx vite build` passe ; branche `main` ; dépôt `jfb4plai/PhonoActif` ; sous-domaine `phonoactif.jfb4plai.com` (conventions PLAI).

## Choix de ce plan, confirmés par JF le 2026-11-11

- Le lien de tâche porte un jeton aléatoire (`#/jeu?t=<jeton>`) ; les réglages sont lus en base par `phono_lire_tache`.
- L'envoi passe par une fonction SQL appelée directement depuis l'app (pas de fonction Vercel).
- Les essais en attente partent aussi automatiquement, en silence, à l'ouverture de l'app et au retour du réseau, en plus des boutons « Envoyer » de l'élève et de l'enseignant.
- Un code QR est généré par la bibliothèque `qrcode` (dépendance de plus).
- L'espace enseignant est dans la même app (`#/enseignant`), pas une app séparée.
- Les rôles s'appellent `master` et `invite` ; le créateur d'une classe en est le `master`.
- Cette version n'a pas de catalogue : la tâche désigne un pack par son nom (dossier du pack déjà déployé avec l'app).

## Review Focus

1. Jeton de tâche inconnu, révoqué ou mal formé ; code d'élève inconnu ou d'une autre classe : refus clair, rien d'écrit (Tasks 2 et 4).
2. Mêmes essais envoyés deux fois (coupure réseau, double clic) : aucun doublon (Tasks 2 et 3).
3. Charge utile malformée ou énorme (ligne sans `positions`, 10 000 lignes) : refusée sans erreur serveur (Task 2).
4. Isolement : un enseignant ne lit ni n'écrit rien dans une classe dont il n'est pas membre ; un invité ne peut ni supprimer ni inviter ; `anon` ne lit aucune table (Task 1).
5. Hors connexion : les essais restent en attente, l'élève ne voit aucune erreur technique, l'envoi reprend plus tard (Tasks 3 et 4).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261112000000_phono_init.sql` | tables, grants, RLS, fonctions d'appartenance |
| `supabase/migrations/20261112010000_phono_rpc.sql` | fonctions `phono_lire_tache` et `phono_envoyer_essais` |
| `tests/sql/harness.js`, `tests/sql/*.test.js` | PGlite : rôles, `auth.uid()` simulé, tests des politiques et des fonctions |
| `src/jeu/session.js` (modifié) | identifiant unique par ligne d'essai |
| `src/sync/envoi.js` | file d'attente, envoi idempotent, lecture de tâche |
| `src/app/route.js` (modifié) | `?t=<jeton>` et écran enseignant |
| `src/enseignant/` | connexion, classes, élèves, tâches, résultats |
| `src/lib/supabase.js` | client Supabase construit depuis les variables d'environnement |
| `docs/registre-traitement-phonoactif.md` | brouillon du registre de traitement pour JF (DPO) |
| `docs/mise-en-ligne.md` | pas à pas GitHub, Vercel, Supabase avec chemins et adresses exactes |

---

### Task 1: Tables, droits et politiques d'accès (SQL, hors base réelle)

**Files:**
- Create: `supabase/migrations/20261112000000_phono_init.sql`, `tests/sql/harness.js`, `tests/sql/init.test.js`
- Modify: `package.json` (devDependency `@electric-sql/pglite`)

**Interfaces:**
- Produces (tables, toutes avec RLS) :
  - `phono_classes(id uuid pk default gen_random_uuid(), name text 1..60, created_by uuid not null references auth.users(id), created_at timestamptz default now())`.
  - `phono_class_members(class_id uuid references phono_classes on delete cascade, user_id uuid references auth.users on delete cascade, role text check in ('master','invite'), created_at, primary key (class_id, user_id))`.
  - `phono_students(id uuid pk, class_id uuid not null references phono_classes on delete cascade, code text check (code ~ '^[A-Za-z0-9-]{1,12}$'), keep_history boolean not null default false, created_at, unique (class_id, code))`.
  - `phono_tasks(id uuid pk, class_id uuid not null references phono_classes on delete cascade, token text not null unique check (token ~ '^[a-f0-9]{24}$'), pack text not null check (char_length(pack) between 1 and 60), mode_mot text check in ('avec','sans'), habillage text check in ('album','sobre'), nb_intrus int check between 0 and 5, exiger_accents boolean, revoked boolean not null default false, created_by uuid not null references auth.users(id), created_at)`.
  - `phono_attempts(id uuid primary key, student_id uuid not null references phono_students on delete cascade, task_id uuid not null references phono_tasks on delete cascade, session text not null, card text not null, word text not null, attempt int not null check (attempt between 1 and 20), correct boolean not null, help text not null check in ('aucune','ecoute','indice','revelation'), positions jsonb not null, played_at timestamptz not null, received_at timestamptz not null default now())`.
- Fonctions `security definer`, `set search_path = public` : `phono_is_member(p_class uuid) returns boolean` (l'utilisateur courant est membre) ; `phono_is_master(p_class uuid) returns boolean` ; déclencheur qui inscrit le créateur comme `master` à l'insertion d'une classe.
- Droits : `authenticated` seulement ; `anon` n'a aucun droit sur aucune table ; `service_role` tous les droits. Politiques : classes, élèves, tâches, essais lisibles par les membres ; classes insérables par tout utilisateur connecté (`created_by = auth.uid()`) ; élèves et tâches insérables et modifiables par les membres ; élèves et classes supprimables par le master seulement ; membres insérables et supprimables par le master seulement ; essais jamais insérables ni modifiables par `authenticated` (seule la fonction de la Task 2 écrit) ; `phono_attempts` supprimable par le master.

- [ ] **Step 1: Write the failing test** : harnais PGlite (schéma `auth` avec `users(id)`, fonction `auth.uid()` lisant `request.jwt.claims`, rôles `anon`, `authenticated`, `service_role`) appliquant la migration ; tests : un utilisateur crée une classe et en devient `master` ; un autre utilisateur ne voit ni la classe, ni ses élèves, ni ses tâches, et ne peut rien y insérer ; le master invite un enseignant (`invite`) qui voit tout, crée des élèves et des tâches, mais ne peut ni supprimer d'élève, ni supprimer la classe, ni inviter ; deux classes peuvent avoir un élève de code `E07`, une même classe non ; code invalide (`E 07`, 13 caractères, accent) refusé par la contrainte ; jeton de tâche mal formé refusé ; `anon` reçoit `permission denied` sur chacune des cinq tables ; `authenticated` ne peut pas insérer dans `phono_attempts` ; la suppression d'une classe supprime en cascade élèves, tâches et essais ; aucune politique ne contient de `exists` sur sa propre table (relecture du texte du SQL).
- [ ] **Step 2: Run** `npm run test:sql` (script `node --test "tests/sql/**/*.test.js"`) ; attendu : FAIL.
- [ ] **Step 3: Implement** la migration (sans commentaires `--`), les grants et les politiques par les fonctions d'appartenance.
- [ ] **Step 4: Run** `npm test` et `npm run test:sql` ; attendu : PASS.
- [ ] **Step 5: ARRÊT : demander l'accord de JF** avant toute exécution sur la base réelle. Après accord seulement : vérifier les conflits de noms (`grep` de la contrainte globale), puis appliquer sur le projet partagé, puis rejouer les mêmes vérifications dans une transaction annulée (`begin; … rollback;`) avec des identifiants d'essai ; rapporter les sorties exactes.
- [ ] **Step 6: Commit** : `git add . && git commit -m "feat: schema phono_ et politiques d'acces (valide sous PGlite)"`.

---

### Task 2: Fonctions d'accès de l'élève

**Files:**
- Create: `supabase/migrations/20261112010000_phono_rpc.sql`, `tests/sql/rpc.test.js`

**Interfaces:**
- Consumes: tables de la Task 1.
- Produces (appelables par `anon` et `authenticated`, `security definer`, `set search_path = public`) :
  - `phono_lire_tache(p_token text) returns jsonb` : `{ "pack", "mode_mot", "habillage", "nb_intrus", "exiger_accents" }` pour une tâche existante non révoquée ; erreur `tache_inconnue` sinon (jeton mal formé inclus). Ne renvoie jamais le nom de la classe, ni d'identifiant interne.
  - `phono_envoyer_essais(p_token text, p_code text, p_lignes jsonb) returns jsonb` : `{ "recus": n, "ignores": m }` ; erreurs `tache_inconnue`, `code_inconnu` (code absent de la classe de la tâche), `charge_invalide` (`p_lignes` n'est pas un tableau, plus de 200 lignes, ligne sans `id` uuid, `session`, `carte`, `mot`, `tentative` entre 1 et 20, `juste` booléen, `aide` dans la liste, `positions` tableau non vide de moins de 40 éléments, `date` interprétable) ; insertion `on conflict (id) do nothing` ; `ignores` compte les lignes déjà reçues.
  - `execute` retiré à `public` sur ces fonctions et accordé à `anon` et `authenticated` seulement.

- [ ] **Step 1: Write the failing test** (PGlite, rôle `anon` pour tous les appels) : tâche valide lue ; réponse sans nom de classe ni identifiants ; jeton inconnu, révoqué, mal formé : `tache_inconnue` ; envoi de deux lignes valides : `recus: 2`, deux lignes en base rattachées au bon élève et à la bonne tâche ; même envoi répété : `recus: 0`, `ignores: 2` ; code d'une autre classe : `code_inconnu`, rien d'écrit ; code absent : `code_inconnu` ; `p_lignes` non tableau, 201 lignes, ligne sans `positions`, `tentative` 0, `aide` inconnue, `juste` texte : `charge_invalide` et rien d'écrit (aucune ligne partielle) ; sensibilité à la casse du code (`e07` n'est pas `E07`) ; `anon` n'a toujours aucun accès direct aux tables.
- [ ] **Step 2: Run** `npm run test:sql` ; attendu : FAIL.
- [ ] **Step 3: Implement** (SQL sans commentaires ; validation de toutes les lignes avant la première insertion).
- [ ] **Step 4: Run** `npm run test:sql` ; attendu : PASS.
- [ ] **Step 5: ARRÊT : demander l'accord de JF**, puis appliquer sur la base réelle et rejouer la vérification dans une transaction annulée (envoi d'une ligne d'essai par un jeton d'essai) ; rapporter les sorties.
- [ ] **Step 6: Commit** : `git add . && git commit -m "feat: fonctions d'acces de l'eleve (lire une tache, envoyer des essais)"`.

---

### Task 3: Envoi des essais depuis l'appareil

**Files:**
- Create: `src/sync/envoi.js`, `tests/sync/envoi.test.js`
- Modify: `src/jeu/session.js` (id de ligne), `tests/jeu/session.test.js`

**Interfaces:**
- Consumes: `LigneEssai`, `StockageEssais` (existants), fonctions SQL de la Task 2.
- Produces :
  - `LigneEssai.id: string` (uuid v4 produit par `deps.nouvelId`, défaut `crypto.randomUUID()`), ajouté par `verifier` et `aider` ; `demarrerJeu` accepte `nouvelId`.
  - `type Supabase = { url: string, anonKey: string, fetch?: typeof fetch }`.
  - `chargerTache(token: string, supabase: Supabase): Promise<{ pack, modeMot, habillage, nbIntrus, exigerAccents }>` : appel `POST <url>/rest/v1/rpc/phono_lire_tache` ; lève `Error('tâche inconnue')` si la fonction répond `tache_inconnue`, `Error('réseau')` si le réseau échoue.
  - `envoyerEssais(params: { lignes: LigneEssai[], dejaEnvoyes: Set<string>, token: string, code: string, supabase: Supabase }): Promise<{ envoyes: number, restants: number, erreur: null|'reseau'|'tache_inconnue'|'code_inconnu'|'refuse', ids: string[] }>` : envoie par paquets de 100 les lignes dont l'`id` n'est pas dans `dejaEnvoyes` ; ne marque comme envoyé (dans `ids`) que ce que le serveur a confirmé (`recus` + `ignores`) ; une erreur réseau ou une réponse 5xx laisse tout en attente ; `tache_inconnue` et `code_inconnu` sont renvoyés tels quels sans réessai automatique.
  - `stockageEnvoyes(options?: { cle?: string, storage?: Storage }): { lire(): Set<string>, ajouter(ids: string[]): void }` (clé `phonoactif-envoyes-v1`, même tolérance aux pannes que `stockageLocal`).

- [ ] **Step 1: Write the failing test** : lignes d'essai de `verifier` ont un `id` unique (deux appels, deux ids) et l'horloge et l'identifiant sont injectables ; `chargerTache` : adresse et en-têtes exacts (`apikey`, `Authorization: Bearer <anonKey>`, `Content-Type`), corps `{ "p_token": … }`, réponse lue ; réponse d'erreur `tache_inconnue` ; réseau coupé ; `envoyerEssais` : 230 lignes dont 20 déjà envoyées : trois appels (100, 100, 10), `envoyes: 210`, `restants: 0` ; erreur réseau au deuxième paquet : le premier paquet est marqué envoyé, le reste en attente, `erreur: 'reseau'` ; 500 : même comportement ; `code_inconnu` : rien de marqué, pas de réessai ; réponse inattendue : `refuse`, rien de marqué ; relancer avec les `ids` ajoutés n'envoie plus rien ; `stockageEnvoyes` avec faux `Storage` qui lève : fonctionne en mémoire.
- [ ] **Step 2: Run** `node --test tests/sync/envoi.test.js tests/jeu/session.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` ; attendu : PASS.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: envoi idempotent des essais et lecture de tache"`.

---

### Task 4: L'élève joue une tâche en ligne et envoie ses résultats

**Files:**
- Modify: `src/app/route.js`, `src/app/App.jsx`, `src/app/Accueil.jsx`, `src/app/Bilan.jsx`, `src/app/jeu.css`
- Create: `src/lib/supabase.js`
- Test: `tests/app/en-ligne.test.jsx`, `tests/app/route.test.js` (cas ajoutés)

**Interfaces:**
- Consumes: `chargerTache`, `envoyerEssais`, `stockageEnvoyes` (Task 3), `chargerPack` (existant).
- Produces :
  - `lireAdresse('#/jeu?t=<24 caractères hexadécimaux>')` renvoie `tache.jeton` ; `#/enseignant` renvoie `{ ecran: 'enseignant' }` ; un jeton mal formé est ignoré ; `ecrireAdresse` accepte `tache.jeton` et ne met alors dans l'adresse que `t=<jeton>`.
  - `src/lib/supabase.js` : `configurationSupabase(env = import.meta.env): { url, anonKey }|null` (null si une variable manque : l'app reste utilisable hors ligne comme avant).
  - **Élève** : avec un jeton, l'accueil lit les réglages par `chargerTache` (les réglages enseignant disparaissent de l'écran élève) ; message clair « Cette tâche n'existe plus » si elle est inconnue ; « Bilan » gagne le bouton **Envoyer mes résultats** (retour : « Résultats envoyés » ou « Pas de connexion : l'envoi se fera plus tard », sans terme technique) ; l'accueil gagne **Envoyer les essais en attente** (zone enseignant) avec le nombre d'essais en attente ; envoi automatique silencieux à l'ouverture de l'app et au retour du réseau (`online`) quand un jeton et un code sont connus ; un code refusé par le serveur (`code_inconnu`) affiche : « Ce code n'est pas dans la classe : demander à l'enseignant ».

- [ ] **Step 1: Write the failing test** (Vitest, faux `fetch`) : adresse avec jeton lue et écrite ; variable manquante : `configurationSupabase` renvoie null et l'app marche sans envoi ; avec jeton, réglages venus de `chargerTache` (mode, habillage, intrus) et pas des paramètres libres ; tâche inconnue : message attendu ; jouer une carte puis « Envoyer mes résultats » : un appel de la fonction d'envoi avec la ligne d'essai et le bon jeton, texte « Résultats envoyés » ; réseau coupé : « l'envoi se fera plus tard », aucune erreur technique à l'écran, essais conservés ; renvoyer ne crée pas de doublon (mêmes ids) ; `code_inconnu` : message attendu ; envoi automatique au retour du réseau (événement `online`) ; l'écran élève ne montre ni le nom de classe ni aucun identifiant interne.
- [ ] **Step 2: Run** `npx vitest run tests/app/en-ligne.test.jsx` et `node --test tests/app/route.test.js` ; attendu : FAIL.
- [ ] **Step 3: Implement** ; installer `@supabase/supabase-js@2` seulement si le client enseignant (Task 5) en a besoin : l'élève n'utilise que `fetch`.
- [ ] **Step 4: Run** `npm test`, `npx vitest run`, `npx vite build` ; attendu : tout passe.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: tache en ligne et envoi des resultats par l'eleve"`.

---

### Task 5: Espace enseignant : connexion, classes, codes, tâches, résultats

**Files:**
- Create: `src/enseignant/api.js`, `src/enseignant/Enseignant.jsx`, `src/enseignant/Connexion.jsx`, `src/enseignant/Classe.jsx`, `src/enseignant/enseignant.css`
- Modify: `src/app/App.jsx` (écran `enseignant`), `package.json` (`@supabase/supabase-js@2`, `qrcode`)
- Test: `tests/enseignant/api.test.js`, `tests/enseignant/ecrans.test.jsx`

**Interfaces:**
- Consumes: client Supabase (`createClient`), `resumerParLiaison` (existant), `ecrireAdresse`.
- Produces (`api.js`, toutes prennent un client Supabase injectable) :
  - `genererJeton(): string` (24 caractères hexadécimaux, `crypto.getRandomValues`) ; `genererCodes(prefixe: string, n: number, debut?: number): string[]` (`E01`…, validés par `codeValide`, sans doublon) ; `lienDeTache(base: string, jeton: string): string` ; `qrDeLien(lien: string): Promise<string>` (URL de données d'une image).
  - `creerClasse(client, nom): Promise<{ id, name }>` ; `lister(client): Promise<{ id, name, role }[]>` ; `ajouterEleves(client, classId, codes): Promise<{ ajoutes: string[], refuses: { code, raison }[] }>` (un code déjà présent est refusé avec la raison `déjà dans la classe`) ; `creerTache(client, classId, tache): Promise<{ id, jeton, lien }>` ; `revoquerTache(client, tacheId)` ; `resultats(client, classId): Promise<{ code, essais: number, derniereSeance: string|null, liaisons: ReturnType<typeof resumerParLiaison> }[]>` (lecture des essais de la classe, regroupés par élève, convertis au format `LigneEssai` avant `resumerParLiaison`) ; `inviter(client, classId, email)` et `supprimerEleve(client, studentId)` réservés au master (l'erreur de refus du serveur est rendue en français : « Réservé au master de la classe »).
  - **Écrans** (`#/enseignant`) : connexion avec le compte PLAI habituel (e-mail et mot de passe ; réinitialisation par e-mail) ; liste des classes ; création de classe ; page de classe : liste des codes avec ajout en lot (champ « Codes des élèves » : placeholder `E01, E02, E03`, aide « Un code, pas un nom. Garder la correspondance avec les élèves sur papier. »), création de tâche (pack, cartes avec ou sans le mot, habillage, intrus, accents) avec lien copiable et QR, révocation, **liste des résultats** par élève (nombre d'essais, dernière séance, trois liaisons les plus ratées au premier coup) ; boutons d'invitation et de suppression visibles et activés seulement pour le master.

- [ ] **Step 1: Write the failing tests** : `genererJeton` (24 caractères hexadécimaux, 1000 appels sans doublon) ; `genererCodes('E', 3)` donne `E01, E02, E03`, respecte la validité et le plafond de 12 caractères, refuse n <= 0 ; `lienDeTache` ; `qrDeLien` rend une URL de données ; `ajouterEleves` avec faux client : doublon dans la liste et déjà présent refusés avec raison, valides ajoutés ; `creerTache` : jeton et lien cohérents, réglages enregistrés ; `resultats` : regroupement par élève, `liaisons` calculées (premier coup, confusions) sur un jeu d'essais fabriqué ; invité qui tente `supprimerEleve` : message « Réservé au master de la classe » ; écrans (Vitest) : sans session, seule la connexion s'affiche ; erreur de connexion en français sans terme technique ; page de classe : boutons master absents ou inactifs pour un invité ; champ des codes avec label, placeholder et aide ; aucune saisie de nom d'élève n'est proposée.
- [ ] **Step 2: Run** `node --test tests/enseignant/api.test.js` et `npx vitest run tests/enseignant` ; attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`, `npx vitest run`, `npx vite build` ; attendu : tout passe.
- [ ] **Step 5: Commit** : `git add . && git commit -m "feat: espace enseignant (classes, codes, taches, resultats)"`.

---

### Task 6: Mise en ligne et essai de bout en bout

**Files:**
- Create: `docs/mise-en-ligne.md`, `docs/recette-en-ligne.md`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces : dépôt GitHub, projet Vercel et base Supabase fonctionnels ; essai réel de bout en bout.

- [ ] **Step 1: ARRÊT : demander l'accord de JF** pour chacune des actions suivantes, une par une, et noter la réponse : (a) créer le dépôt `jfb4plai/PhonoActif` (privé ou public : question à JF) ; (b) le premier `git push` sur `main` (`npx vite build` d'abord, `.gitignore` relu : `public/sons`, `public/packs`, `data/` absents) ; (c) créer le projet Vercel relié au dépôt et poser `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (valeurs lues par JF dans le tableau de bord Supabase ; l'exécutant ne les lit ni ne les écrit en clair dans une réponse) ; (d) ajouter `https://phonoactif.jfb4plai.com/**` aux URL de redirection de l'authentification Supabase sans modifier l'URL du site ; (e) créer le sous-domaine `phonoactif.jfb4plai.com` ; (f) la visibilité du dossier `public/packs/demo` (dessins provisoires) et des sons `public/sons` : ne pas les publier tant que JF n'a pas tranché sur la licence de la voix.
- [ ] **Step 2: Write** `docs/mise-en-ligne.md` : pas à pas pour JF avec chemins Windows complets et adresses exactes de chaque tableau de bord ; liste des variables ; ordre des opérations ; retour arrière de chaque étape.
- [ ] **Step 3: Execute** les actions accordées, une à la fois, en rapportant la sortie exacte de chaque commande.
- [ ] **Step 4: Essai de bout en bout** sur l'adresse déployée, avec le compte de JF : se connecter, créer la classe « Essai », trois codes, une tâche sur le pack d'essai, ouvrir le lien sur un second appareil, jouer deux cartes, envoyer, relire les résultats côté enseignant ; couper le réseau pendant une séance et vérifier l'envoi différé ; tenter l'envoi avec un code absent. Noter ce qui n'est pas vérifiable (son, tablette).
- [ ] **Step 5: Nettoyage ARRÊT : demander l'accord de JF** pour supprimer la classe d'essai et ses données (suppression en cascade) et rapporter ce qui a été supprimé.
- [ ] **Step 6: Write** `docs/recette-en-ligne.md` (cases à cocher, chemins complets, « Ce qui n'est pas vérifié »).
- [ ] **Step 7: Commit** : `git add docs && git commit -m "docs: mise en ligne et recette en ligne"`.

---

### Task 7: Brouillon du registre de traitement

**Files:**
- Create: `docs/registre-traitement-phonoactif.md`

**Interfaces:**
- Produces : un document pour JF, DPO du Pôle, qui décide ; chaque champ rempli d'après les décisions 1 à 19 de la spec, les inconnues marquées `[à décider par JF]`.

- [ ] **Step 1: Write** les rubriques : responsable du traitement et DPO (JF) ; finalité ; catégories de personnes (élèves sous code, enseignants, intervenants) ; catégories de données (codes, essais détaillés, comptes enseignants, confirmations d'accord parental) ; absence de nom d'élève ; base légale `[à décider par JF]` ; destinataires (enseignants de la classe, intervenant par code temporaire en lecture seule) ; sous-traitants (Supabase, région déclarée « Europe » à préciser, Vercel, GitHub) avec ce que chacun reçoit ; transferts hors Union européenne `[à décider par JF]` ; durées (purge annuelle, option « conserver » par élève, codes de partage 30 jours + 30 jours, `date de la purge [à décider par JF]`) ; mesures de sécurité (RLS, jetons, aucune clé secrète côté navigateur, droits master et invité) ; droits des personnes et comment les exercer `[à décider par JF]` ; analyse d'impact : nécessité à apprécier `[à décider par JF]`.
- [ ] **Step 2: Verify** que chaque affirmation du registre renvoie à la décision numérotée de la spec ou à un fichier du dépôt, et qu'aucune n'est inventée : relire ligne à ligne.
- [ ] **Step 3: Commit** : `git add docs && git commit -m "docs: brouillon du registre de traitement"`.

---

## Self-Review

**Couverture des décisions 1 à 19.** Visibilité enseignants et partage logopède : le partage est hors plan (étape suivante), la lecture par les membres est dans la Task 1 ; envoi en fin de séance, par l'élève ou l'enseignant, différé hors connexion, rattaché par le lien : Tasks 2, 3 et 4 ; compte enseignant PLAI : Task 5 ; master et invité : Tasks 1 et 5 ; codes uniques par classe : Task 1 ; détail de chaque essai : Task 1 ; administrateurs, catalogue, demandes, corrections proposées, purge annuelle, code logopède avec accord parental : **hors de ce plan**, étapes suivantes ; stockage des packs dans Supabase : hors de ce plan (cette version lit les packs livrés avec l'app) ; projet Supabase partagé et nom PhonoActif : Task 6 ; DPO : Task 7. **Hors de ce plan, explicitement** : tableau de bord en grille, partage avec la logopède, catalogue et demandes, corrections phonétiques en ligne, purge annuelle, export ZIP, liaison avec HubActif.

**Cohérence des types.** `LigneEssai` gagne `id` (Task 3) et est envoyée par la fonction de la Task 2 dont la validation reprend exactement ses champs ; `resultats` (Task 5) reconvertit les lignes de `phono_attempts` en `LigneEssai` pour `resumerParLiaison`.

**Proportion.** Signatures, règles et assertions ; aucun corps de fonction écrit.
