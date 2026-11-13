# PhonoActif : dossier d'audit pour relecture par des professionnels

Date : 2026-11-13. Auteur de l'audit : Claude (Sonnet 5.5), à la demande de Jean-François Beguin (PLAI, Pôle Territorial de la Ville de Liège).
Statut du document : brouillon à relire par JF avant envoi. Rien ici n'est un avis juridique, médical ou pédagogique validé.

**Hypothèses (non données par JF)** : les relecteurs visés sont (1) un·e logopède ou linguiste pour la phonétique et la pédagogie, (2) un·e développeur·se ou spécialiste sécurité pour le code et la base, (3) un·e juriste ou DPO externe pour les données et les licences. JF est lui-même DPO du Pôle ; un avis externe reste un second regard.

Trois statuts sont utilisés partout : **constaté** (commande ou lecture de code, citée), **déduit** (raisonnement à partir de ce qui a été lu, non essayé), **non vérifié**.

---

## 1. Résumé

PhonoActif (anciennement « Lilémo numérique ») est une application pour élèves en apprentissage tardif de la lecture ou en remédiation : l'élève pose des lettres, l'application lit ce qui est posé avec une voix belge de synthèse. Un espace enseignant donne les liaisons graphème-son à retravailler.

**Ce qui fonctionne (constaté)** : un jeu de construction de mot par cubes de graphèmes, un espace enseignant avec classes, codes anonymes et tâches par lien, 347 tests automatiques du moteur, un moteur de règles de lecture, une base de données avec contrôle d'accès par ligne.

**Ce qui n'existe pas encore (constaté)** :
- Le mode de jeu décidé le 2026-11-12 (« mode A » : lecture lettre par lettre avec changement rétroactif, « m », « ma », « mè », « maison ») n'est **pas branché** dans le jeu. Le jeu en ligne est le jeu antérieur, par cubes de graphèmes, avec un son pré-enregistré par cube. Preuve : aucune référence à `etatsDuMot` ou `lireRegles` dans `src/app`, `src/jeu`.
- Aucune fonction serveur de lecture en direct (pas de dossier `api/`). La bibliothèque audio complète n'est pas générée (50 fichiers sur 2 780 prévus).
- Aucun élève n'a testé l'application. Aucun·e logopède ne l'a relue. Aucune étude d'effet.

**Les six points qui méritent le plus l'avis d'un pro** :
1. La mesure de justesse des règles (93 à 96 %) compare les règles à un lexique, pas à une écoute humaine, et ne couvre pas les pseudo-mots, qui sont pourtant la majorité des états du mode A.
2. Le principe pédagogique du mode A (un même début de mot change de lecture quand on ajoute des lettres) n'a aucune base trouvée dans la littérature du corpus RISS et n'a jamais été essayé avec des élèves.
3. L'écriture anonyme des résultats par un lien d'élève est ouverte sans limite de débit (déduit, lecture du SQL).
4. La fonction d'invitation d'un enseignant permet de tester si une adresse e-mail existe dans la base partagée de toutes les applications PLAI (déduit).
5. Les licences de plusieurs sources (ManuLemme, Lexique 4.1, Lingua Libre) ne sont pas levées ; plusieurs sont incompatibles avec une redistribution libre. La liste VOB a été validée par JF (elle fait partie du référentiel).
6. Le travail des deux derniers jours sur le moteur (règles, états, syllabes, 3 outils de mesure, 3 jeux de tests) n'est **pas dans Git** (constaté : fichiers non suivis). Il n'existe que sur le disque OneDrive.

---

## 2. Ce qui existe, composant par composant

| Composant | État | Preuve |
|---|---|---|
| Moteur : segmentation guidée par ManuLemme, corrections de JF, filtres de mots sans IA | codé, testé | `src/core/` (1 067 lignes), 347 tests node |
| Règles contextuelles de lecture (`lireRegles`) | codé, testé, **non commité** | `src/core/regles.js`, `tests/core/regles.test.js` |
| États lettre par lettre (`etatsDuMot`) | codé, testé, **non commité**, non branché au jeu | `src/core/etats.js` |
| Syllabation sur les sons, table son vers IPA | codé, testé, **non commité** | `syllabes.js`, `ipa.js` |
| Jeu élève par cubes de graphèmes (React) | en ligne, version déployée non vérifiée | `src/app/`, 58 tests Vitest ; `phonoactif.vercel.app` répond 200 |
| Espace enseignant (connexion, classes, codes, tâches, résultats, invitation) | codé | `src/enseignant/` |
| Base : 5 tables `phono_*`, 3 migrations, RLS | écrit ; 32 tests sur PostgreSQL simulé (PGlite) ; **non exécuté sur la base réelle** (registre de traitement, section 7) | `supabase/migrations/` |
| Page de revue des mots à codes inconnus | codée ; recette de JF non faite | `revue/revue.html`, `docs/recette-revue.md` (0 case cochée sur 10) |
| Voix : Azure Charline (fr-BE) pilotée par IPA | essai écouté par JF sur 37 sons, 20 syllabes, 20 pseudo-mots, 16 états | `essai-tts-ipa/` |
| Bibliothèque audio de syllabes | 50 fichiers générés sur 2 780 | `generer-bibliotheque.py` |
| Pack de cartes (images, mots) | 1 pack d'essai de 5 mots, dessins provisoires | `public/packs/demo/` |
| Tableau de bord enseignant (grille élèves par sons, seuils, relevé PDF) | **non construit** ; seuls les résultats bruts sont listés | design section 8 |
| Recette sur tablette | non faite (0 case cochée sur 3 dans `recette-eleve.md`) | `docs/recette-eleve.md` |

---

## 3. Mesures reproductibles

Toutes lancées le 2026-11-13 depuis `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif`.

| Commande | Résultat constaté |
|---|---|
| `npm test` | 347 tests, 346 réussis, 1 ignoré, 0 échec |
| `npx vitest run` | 58 tests réussis (4 fichiers) |
| `npm run test:sql` | 32 tests réussis |
| `python -I -m unittest discover -s tools -p "test_*.py"` | 12 tests réussis |
| `npx vite build` | réussi ; script principal 172,9 ko (57 ko compressé), espace enseignant 245,5 ko (65 ko compressé) |
| `node tools/mesurer_regles.js` | voir ci-dessous |

Justesse des règles de lecture comparées à ManuLemme (constaté) :

| Jeu de mots | Mots comparables | Règles = ManuLemme | Erreurs non signalées par l'application |
|---|---|---|---|
| P1 (881 mots), **a servi à écrire les règles** | 881 | 848 (96,3 %) | 16 sur 33 |
| Moitié B hors P1, **jamais regardée** | 6 575 | 6 137 (93,3 %) | 184 sur 438 |

Lecture honnête de ces chiffres : « justesse » veut dire « identique à la transcription de ManuLemme ». Ce n'est pas une justesse mesurée à l'oreille. ManuLemme peut lui-même se tromper ou avoir une prononciation de référence différente (voir section 5, point 3).

---

## 4. Pédagogie et logopédie

| # | Constat | Statut | Gravité | Question au pro |
|---|---|---|---|---|
| P1 | Le mode A fait entendre des états intermédiaires qui sont des pseudo-mots lus par règles, dont la lecture change quand on ajoute une lettre (m + a + i + s + o + n : « m », « ma », « mè », « mèz », « mèzo », « maison »). | décision de JF, non essayée | haute | Ce changement de lecture en cours de construction aide-t-il ou trouble-t-il un enfant dyslexique ? Faut-il un mode où la lecture ne change qu'à l'état final ? |
| P2 | Mode B (lecture par graphèmes cibles) refusé par JF comme « contre-productif en apprentissage et en décodage ». Jugement de JF, **non trouvé dans le corpus RISS**. Le seul texte voisin vu (Boggio et Bosse 2022, hal-03811405) rapporte que le ministère déconseille les méthodes qui introduisent d'autres stratégies que le décodage ; extrait lu, pas l'article entier. | jugement non sourcé | moyenne | Le refus est-il défendable ? Existe-t-il des données sur la fusion cumulative en remédiation ? |
| P3 | Aucune étude d'effet. Aucune référence RISS directe sur la fusion cumulative rétroactive (recherche du 2026-11-12). Une revue ce jour a retrouvé un outil voisin : GraphoGame (Ruiz, Lassault, Sprenger-Charolles, Richardson, Lyytinen, Ziegler, 2017, hal-01909660), jeu numérique pour enfants en difficulté de lecture. Ziegler 2018 (hal-02334227) écrit, dans l'extrait lu, qu'une tablette peut présenter des stimuli auditifs et visuels de bonne qualité (phonèmes, lettres, syllabes, mots). | constaté (existence des deux références) ; contenu lu en extrait seulement | moyenne | Quels protocoles d'évaluation minimums avant diffusion ? GraphoGame est-il un bon point de comparaison ? |
| P4 | Seuils du tableau de bord (rouge sous 60 %, orange de 60 à 80 %, vert au-dessus, gris sous 5 essais, « récurrent » dès 3 séances) : **choix provisoires de Claude, sans source**. | constaté (design, section 8) | moyenne | Quels seuils un·e logopède utilise-t-il·elle pour parler d'une liaison acquise ? |
| P5 | Le public cible (élèves en apprentissage tardif ou en remédiation) n'a pas été consulté. Le jeu physique Lilémø est connu par sa notice, pas par un usage observé. | constaté (design, question ouverte 1) | haute | Comment organiser un premier essai avec 3 à 5 élèves ? |
| P6 | Les images ont été déclarées nuisibles par JF dans certains cas (option « image » avec sous-option « mot sur l'image »). L'argument « l'image pousse à deviner » a été retiré après lecture de Boggio et Bosse. | décision de JF | basse | Position d'un·e logopède sur l'image dans la remédiation. |

---

## 5. Phonétique et voix

| # | Constat | Statut | Gravité | Question au pro |
|---|---|---|---|---|
| F1 | La voix Charline fr-BE lit l'IPA à la lettre : toute erreur de la table graphème vers IPA est audible. Écoutes faites **par une seule personne** (JF), sur un échantillon, sans élève. | constaté | haute | Faire valider par un·e phonéticien·ne belge (pistes dans la spec : UMONS, UCLouvain, ULB, ULiège) les 37 sons, la syllabation, et un échantillon de pseudo-mots. |
| F2 | Sur 33 erreurs de P1 et 438 de la moitié B, environ 45 % ne sont pas signalées par l'application (champ `ambigu`). Une mauvaise lecture peut donc sembler juste. | constaté | haute | Un enfant dyslexique peut-il être induit en erreur par une lecture fausse présentée comme juste ? |
| F3 | La référence de prononciation est ManuLemme (France, lemmes). Sur 15 791 mots communs, Lexique 4.1 est identique pour 84,0 % hors e muet ; sur 14 désaccords examinés, ManuLemme paraissait conforme à la prononciation standard et Lexique non (ce, peur, chocolat, donner). **Échantillon petit, non systématique.** Aucune vérification contre la prononciation belge. | constaté | moyenne | Quels écarts belge/France faut-il traiter (e muet, o ouvert/fermé, eu, finales) ? |
| F4 | Les mots dont un code ManuLemme est inconnu du moteur (« il », « 8 », « Ej »…) sont mis dans une file de revue : 823 mots, dont 60 de P1 (ville, nuit, soleil, crayon…). Pour l'essai d'écoute de ce jour, quatre IPA ont dû être écrits à la main. | constaté | moyenne | Valider la liste des 823 mots et les lectures proposées. |
| F5 | Voyelle /e/ de « ré » moins franche que celle de « dé » à l'écoute de JF ; mesure acoustique indicative (F1 449 Hz contre 336 à 378 Hz) sur un seul /ʁV/. Cause systémique non démontrée. Les mesures acoustiques de Claude se sont déjà trompées une fois (voyelle brève « gè ») : seule l'oreille de JF fait foi. | constaté | basse | Écoute croisée par une voix humaine belge pour les sons en échec. |
| F6 | Chaînes limitées à 8 lettres (hypothèse tirée des 8 cases du Lilémø), au-delà de 4 lettres lecture par syllabes collées. Syllabation validée contre Lexique 4.1 : 98,5 % avant ajustement, 99,7 % après trois ajustements faits sur le même jeu. Cela mesure l'accord avec Lexique, pas la justesse phonologique. | constaté | basse | La syllabation phonologique est-elle celle qu'on veut entendre en classe ? |
| F7 | Les états intermédiaires pris pour des pseudo-mots n'ont **aucune mesure de justesse**. Or ils forment l'essentiel de ce que l'élève entendrait en mode A. | constaté (`docs/limites-a-afficher.md`, limite 1) | haute | Protocole pour mesurer la justesse de lecture de pseudo-mots (liste, juges, critère). |

---

## 6. Données lexicales et licences

| # | Source | Usage | Licence | Statut |
|---|---|---|---|---|
| L1 | ManuLemme 2.4 (16 004 entrées) | cœur du moteur, transcription de référence | « OK » selon JF, recherche de JF ; Claude ne l'a pas vérifiée | non vérifié |
| L2 | `data/corrections.json` (corrections de JF dérivées de ManuLemme) | **suivi dans Git**, dépôt `github.com/jfb4plai/PhonoActif` | héritée de ManuLemme ; visibilité du dépôt non vérifiée | non vérifié |
| L3 | Liste VOB par année (3 435 mots) | listes par année | validée par JF le 2026-11-13 : elle fait partie du référentiel ; non vérifiée par Claude ; fichier d'origine déplacé | déclaré par JF |
| L4 | Lexique 4.1 (lexique.org) | comparaison locale, formes fléchies | la page affiche CC BY-SA, le lien pointe vers CC BY-NC ; **non levée** ; non redistribué | constaté |
| L5 | Lingua Libre (Wikimedia Commons) | écoute comparative ; éventuel usage futur | licence par fichier. Échantillon de 89 fichiers interrogés ce jour : Poslovitch CC0 (30/30), Sartus85 CC BY-SA 4.0 (29/29), LoquaxFR CC BY-SA 4.0 (27/30) et CC BY 4.0 (3/30). La clause « partage dans les mêmes conditions » est à confronter à la licence PolyForm Noncommercial du dépôt. | constaté (API Commons) pour les licences ; compatibilité **non vérifiée** |
| L6 | Voix Azure (Charline) | audio publié dans l'application | conditions d'utilisation Microsoft sur la redistribution de l'audio généré : **non lues** | non vérifié |
| L7 | ARASAAC (images) | envisagé | CC BY-NC-SA ; mauvais sens automatiques | constaté (mémoire de projet) |
| L8 | Licence du projet | dépôt | PolyForm Noncommercial 1.0.0 (fichier `LICENSE`) | constaté |

Question au juriste : un lexique sous CC BY-SA ou CC BY-NC, utilisé pour **produire** des fichiers audio et des données dérivées publiés avec une application non commerciale, impose-t-il le partage à l'identique des dérivés ?

Autres points : la facturation Azure pour du SSML (caractères comptés sur le corps ou sur le document entier) n'est pas vérifiée : la bibliothèque complète représente environ 209 000 à 580 000 caractères selon la règle, pour un quota gratuit de 500 000 caractères par mois (non vérifié).

---

## 7. Sécurité et base de données

Tout ce qui suit est **déduit de la lecture du SQL** (`supabase/migrations/`) et du code. Rien n'a été essayé contre la base réelle, qui n'a pas été testée (les 32 tests tournent sur PGlite).

Points solides (constaté dans le SQL) :
- RLS activée sur les 5 tables, `revoke all` pour `anon`, tables préfixées `phono_`.
- Fonctions `security definer` avec `set search_path = public` ; contrôle d'appartenance par fonction (pas d'auto-jointure récursive).
- Envoi des essais : validation stricte de chaque champ, lot de 200 lignes au plus, rejet de tout le lot si une ligne est invalide, idempotence par identifiant.
- Aucune clé secrète dans `src/` ni dans les migrations (recherche de motifs de clés et de `console.log` : aucun `console.log` ; les seules occurrences sont l'en-tête `apikey` avec la clé publique anonyme dans `src/sync/envoi.js`, attendu, et des `grant ... to service_role` dans le SQL).

| # | Constat (déduit) | Gravité | Piste |
|---|---|---|---|
| S1 | **Écriture anonyme sans limite de débit** : `phono_envoyer_essais` est appelable par `anon` avec un jeton de 24 caractères hexadécimaux et un code d'élève (1 à 12 caractères alphanumériques, p. ex. « E07 », devinable). Tout élève qui possède le lien (QR, adresse) peut poster des résultats **au nom d'un autre code** de la classe, ou saturer la table. Les données du tableau de bord enseignant deviennent non fiables. | haute | Limite de débit (Edge Function ou quota par jeton), code d'élève plus long ou secret court, signalement d'anomalies. |
| S2 | **Oracle d'existence d'e-mail** : `phono_inviter` répond `enseignant_inconnu` si l'adresse n'existe pas dans `auth.users`, `deja_membre` sinon. Tout compte authentifié peut créer une classe (il devient `master`) puis tester des adresses. La base d'authentification est **partagée par toutes les applications PLAI**. | haute | Réponse uniforme, invitation par e-mail envoyé, limite d'appels. |
| S3 | Messages d'erreur distincts `tache_inconnue` et `code_inconnu` : un détenteur de jeton peut confirmer quels codes d'élèves existent dans la classe. | moyenne | Réponse unique. |
| S4 | La politique de modification de `phono_classes` laisse tout membre (y compris `invite`) modifier `created_by`. La politique de lecture autorise `created_by = auth.uid()` : un membre peut donc donner la lecture de la ligne classe à un identifiant tiers. Faible impact (le nom de la classe), mais c'est une élévation de portée. De même, un membre `invite` peut modifier le jeton et la révocation des tâches. | moyenne | Retirer `created_by` de la liste des colonnes modifiables (grant par colonne ou trigger). |
| S5 | Le jeton d'une tâche est dans l'URL (QR, lien). Il est révocable (`revoked`), mais il n'a pas d'expiration. | moyenne | Expiration automatique, rotation. |
| S6 | La fonction serveur de lecture en direct n'existe pas encore. Quand elle sera écrite : clé Azure côté serveur, contrôle d'accès, limite de débit, plafond de coût. Le risque est connu mais non traité. | à prévoir | Cahier des charges à écrire avant le code. |
| S7 | `phono_students.keep_history` existe dans le schéma mais n'est lu nulle part (constaté : seule occurrence hors migration dans un fichier SQL de collage). | basse | Supprimer ou implémenter. |
| S8 | Aucune purge programmée : la « purge annuelle » voulue par JF n'est pas écrite. | moyenne | Tâche planifiée Supabase. |

---

## 8. Protection des données

Le registre de traitement (`docs/registre-traitement-phonoactif.md`) est un **brouillon** ; JF est DPO.

| # | Constat | Statut |
|---|---|---|
| D1 | Cases non tranchées dans le registre : responsable du traitement, base légale, durée du lien de tâche, date de purge, procédure des droits d'accès, de rectification et d'effacement, nécessité d'une AIPD. | constaté |
| D2 | Données d'élèves : code anonyme, mot, tentative, juste/faux, aide utilisée, date, et pour chaque essai la liste des liaisons graphème-son réussies ou ratées. Le profil par code peut révéler des difficultés d'apprentissage : **donnée de santé indirecte ?** (question posée par le registre, non tranchée). Public mineur. | constaté |
| D3 | Région d'hébergement réelle du projet Supabase partagé non contrôlée ; transferts liés à Vercel non décidés. | non vérifié |
| D4 | Mention d'information aux représentants légaux : non rédigée. Partage avec un·e logopède : non spécifié (jeton temporaire, consentement). | constaté |
| D5 | Copie locale des essais dans le navigateur de l'élève (localStorage) : effacement non vérifié. | non vérifié |
| D6 | Aucune IA n'est appelée sur des données d'élèves ; les mots sont choisis par l'enseignant ou par filtres déterministes (règle de JF). | constaté (code et registre) |

---

## 9. Accessibilité et ergonomie

| # | Constat | Statut |
|---|---|---|
| A1 | Texte de base 18 px, aides 16 px, cubes de 56 px de haut, boutons de 48 px, contour de focus de 4 px, police Arial (choix cohérent avec les épreuves externes de la FWB). | constaté (`src/app/jeu.css`) |
| A2 | Aucune règle `prefers-reduced-motion` dans `src/` (recherche vide). Impact réel inconnu si le jeu contient des animations. | constaté |
| A3 | Contrastes non mesurés ; aucun test automatisé d'accessibilité (type axe) ; aucune recette sur tablette ; aucune relecture par un·e ergothérapeute ou un·e enseignant·e spécialisé·e. | non vérifié |
| A4 | Le tableau de bord enseignant prévu code l'état par couleur **et** symbole (exigence de JF) ; il n'est pas construit. | constaté |
| A5 | Les sons de bouche, l'avatar et le visage n'existent pas (choix reportés). | constaté |

---

## 10. Qualité logicielle et dépôt

| # | Constat | Statut | Gravité |
|---|---|---|---|
| Q1 | **Le moteur de règles n'est pas versionné** : `regles.js`, `etats.js`, `ipa.js`, `syllabes.js`, leurs 3 fichiers de test, 14 outils de `tools/`, tout `essai-tts-ipa/`, les rapports `docs/`. `src/core/index.js` est modifié sans être commité. Une panne de disque ou une erreur OneDrive les ferait perdre. | constaté (`git status`) | haute |
| Q2 | Fichiers générés suivis dans Git (`__pycache__/*.pyc`) ; 18 fichiers audio d'essai (`essai-sons-coupes/`) suivis. | constaté | basse |
| Q3 | Les sons de `public/sons/` sont ignorés par Git (`.gitignore`) mais utilisés par le jeu : un clone du dépôt ne contient pas les sons. La version publiée dépend de ce qui a été déployé depuis le poste de JF. | constaté ; état du déploiement non vérifié | moyenne |
| Q4 | Pas d'intégration continue. Les tests tournent à la main. | constaté | moyenne |
| Q5 | Le jeu d'essais est réduit : un seul pack de 5 mots. Les tests d'interface tournent dans jsdom, pas dans un navigateur ni sur tablette. | constaté | moyenne |
| Q6 | Le fichier `phonoactif-spec.md` porte encore le titre « spécification v0.1 (brouillon) » alors qu'il contient la v0.2. Plusieurs documents se recoupent (spec, design, journaux). | constaté | basse |
| Q7 | Données lourdes non commitées volontairement (`data/lexique.json`, 3,4 Mo) : un clone ne peut pas lancer les tests qui en dépendent. | constaté | moyenne |

---

## 11. Alternatives et lectures à confronter

- **Dico des écoles** (ledicodesecoles.fr, projet de Franck Rouillé) : fait le chemin inverse (son vers écrit), gratuit, bêta ; complémentaire, sans suivi d'élève. Aucun contact pris.
- **PhonoFusion** (phonofusion.com) : outil dont la spec v0.1 est issue ; retour aux auteurs ou application PLAI nouvelle : décision ouverte.
- **GraphoGame** (voir P3).
- **Lilémø physique** : le lien avec le jeu physique est une règle permanente du projet (`docs/superpowers/specs/2026-11-11-lilemo-numerique-design.md`, section 9).

---

## 12. Questions précises, par profil

**Logopède / linguiste**
1. Le mode A est-il défendable pour la remédiation ? Quelle variante essayer en premier ?
2. Valider un échantillon de 100 états intermédiaires (pseudo-mots) : lecture correcte, acceptable, fausse.
3. Les seuils d'acquisition d'une liaison (60 % / 80 %) ont-ils un équivalent clinique ?
4. Quels écarts belge / France faut-il corriger en priorité ?
5. Le refus du mode B (par graphèmes cibles) est-il à maintenir ?

**Développeur·se / sécurité**
1. Relire les 3 migrations (S1 à S5) et proposer le correctif le plus léger.
2. Concevoir la fonction de lecture en direct (accès, débit, coût).
3. Proposer une stratégie de sauvegarde des sons et des données lourdes, hors OneDrive.

**Juriste / DPO**
1. Compatibilité des licences de la section 6 avec le mode de publication (L1 à L6).
2. Base légale, AIPD, durée de conservation, information des familles (D1 à D4).
3. Le profil par code d'élève est-il une donnée de santé ?

---

## 13. Ce que cet audit n'a pas fait

- Aucun test sur la base Supabase réelle ; aucune attaque simulée.
- Aucun élève, aucun enseignant utilisateur consulté.
- Version déployée sur `phonoactif.vercel.app` non comparée au code local (le site répond, c'est tout).
- Pas de lecture intégrale des références RISS : seuls l'existence et l'extrait de hal-03811405, hal-01683286, hal-03118037, hal-02334227, hal-01001916 et hal-01909660 ont été revus ce jour. Les autres références de la spec (par exemple hal-04561796) n'ont pas été revérifiées pour cet audit.
- Pas de mesure de contraste, pas de test avec lecteur d'écran.
- Pas de vérification du dépôt GitHub (visibilité publique ou privée non vérifiée).
- Pas de relecture des 33 ko du document de conception ligne par ligne : seuls les titres et les sections citées ont été lus.

## 14. Reproduire

```powershell
cd "C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif"
npm test
npx vitest run
npm run test:sql
node tools/mesurer_regles.js
npx vite build
```
