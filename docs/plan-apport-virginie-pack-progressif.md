# Apport de Virginie + pack P1 progressif : plan (2026-11-20)

Statut : proposition, rien n'est codé, rien n'est publié. Source : `phonoactif\Apport Virginie à Phonoactif.docx` (lu le 2026-11-20 via une copie, le fichier était ouvert dans Word).
Statuts utilisés : **constaté** (mesuré par exécution ou lecture), **déduit**, **non vérifié**.

## 1. Ce que je comprends de l'apport

**A. Choix des mots pour élèves en difficulté (règles sur les mots)**
1. Pas de graphèmes visuellement proches dans le même mot : e/a, t/f, d/b/p/q, u/n, on/ou, an/au, en/eu.
2. Apprendre d'abord les consonnes **longues** (f m l s n r v j z), ensuite les **courtes** (p k d t q b). Voyelles : e, o, è, u, a, i, é.
3. Pas deux lettres de même famille phonétique dans un mot : P/B/M, F/V, CH/J, C/G, T/D.
4. Éviter les structures voyelle-consonne-consonne et consonne-consonne-voyelle (arb, tri).

**B. Maternelle (M1-M3)**
5. Lettres en **majuscules** par défaut.
6. Mots à **initiale vocalique** avec image ; l'élève choisit la première lettre parmi **3 voyelles** ; une fois posée, il entend le son de la lettre, puis le mot entier (symbolisé par l'image).

**C. Digraphes comme pièces**
7. Pièces de 2 lettres (ch ph ou an oi eu on in en ai au ei un), 3 lettres (ein eur eau ail ain eil ouil oin), 4 lettres (euil).
8. P1 : tous les digraphes actifs par défaut, l'enseignant peut décocher par longueur (2, 3, 4). P2 et plus : aucun par défaut, l'enseignant peut cocher par longueur.

**Hypothèses (non données par Virginie) :**
- « Pièce » = pièce du plateau de construction du mot ; « digraphe actif » = le digraphe forme une seule pièce, « inactif » = ses lettres sont des pièces séparées.
- Les règles 1 à 4 s'appliquent aux **mots** d'une liste. Leur application aux **intrus** du plateau et aux **3 voyelles** proposées en maternelle est ma déduction, à confirmer.
- Le tableau long/court est une liste d'apprentissage ; il ne classe pas ch, gn, w, x, y (non classés dans le document).

**Anomalie à confirmer :** « ouil » est rangé dans les digraphes de 3 lettres, mais il compte 4 lettres.

## 2. État de l'app (constaté, lecture du code et des données)

- Catalogue publié : **187 mots** (`public\mots\catalogue.json`), 154 avec image, 33 sans. Identique à `data\base\fiches.json` (187).
- Le plateau forme **une pièce par graphème** (`src\jeu\plateau.js`) : les digraphes sont toujours des pièces entières aujourd'hui ; l'option « décocher les digraphes » n'existe pas. Aucune trace de majuscules, de digraphes en option ni de maternelle dans `src` (recherche sans résultat).
- Intrus (`src\core\intrus.js`) : seules les paires b/d, p/q, m/n, u/n sont évitées ; le réservoir contient `on`, `ou`, `an`, `a`, `é`, `t`, `f` : il peut donc créer des paires que Virginie veut éviter [déduit].
- Les essais élèves enregistrent le **mot**, la réussite et l'aide (`phono_attempts`) : un bilan par type de structure est possible sans changer ces tables, en retrouvant l'étiquette du mot [déduit, non vérifié].
- Le bilan actuel (`src\app\Bilan.jsx`) n'affiche que le nombre de cartes vues.

## 3. Pack P1 progressif : méthode

Chaque mot est calculé par un script déterministe (aucune IA ne choisit, règle du 2026-11-11), sur ManuLemme (graphèmes, sons, fréquence P1) et la liste P1 de JF / VOB. Le script est dans le dossier temporaire de session, pas dans le projet.

**Filtres appliqués à tous les mots du pack :** aucune paire visuelle proche (règle 1), aucun jumeau phonétique (règle 3), pas de CCV ni VCC dans les paliers 1 à 7 (règle 4), pas de mot composé.
**Règle « un seul cumul » :** socle = voyelles simples, consonnes longues, syllabes ouvertes (CV, VCV, CVCV), aucune lettre muette, aucun digraphe. Chaque palier ajoute **une seule** difficulté au socle. Un mot qui en cumule deux est écarté.
**Exclus à dessein :** café, pâté, élan, fâché (é et a ensemble : la règle e/a ne dit pas si é compte comme e, à trancher) ; taxi (x = ks, non classé) ; minou, neveu (u/n dès qu'on décoche les digraphes).

Remplacement 2026-11-22 (demande de JF) : « mémé » remplacé par « lama » (palier 1) : mémé n'avait pas de fiche (identifiant « meme » déjà pris par « même »). Lama : l-a-m-a, deux syllabes ouvertes, consonnes longues l et m, aucune lettre muette, aucun digraphe, aucune paire visuelle ni jumeau phonétique dans le mot (contrôle par script sur data/lexique.json, 2026-11-22) ; hors liste P1 / VOB (†) ; se dessine comme UN animal. Alternative écartée : « lavé » (adjectif, image ambiguë).

Légende : `*` déjà au catalogue avec image, `°` au catalogue sans image, sans marque = à créer. `†` = hors liste P1 de JF / VOB (fréquence P1 ManuLemme entre 0 et 43) : niveau P1 à valider par JF.

### Noyau : 65 mots, paliers 1 à 7

| Palier | Difficulté ajoutée au socle | Mots |
|---|---|---|
| 1 | aucune (socle) | ami*, joli, mari†, sofa†, mimi†, ravi†, volé†, fumé†, lama† |
| 2 | consonne courte (p t d b…) | papa*, bébé*, côté*, midi, rôti, télé, épi†, poli† |
| 3 | e muet final | rue*, vie, fée, fumée, vue†, série†, revue†, momie† |
| 4 | syllabe fermée (CVC), consonnes longues (décision 5 : après l'e muet) | fil, mur, sol, sur*, mal, lis, vol†, vis† |
| 5 | autre lettre muette (t, d, s, z) | lit*, rat*, nid*, jus, riz, lilas, avis†, salut† |
| 6a | digraphe ou | fou, mou†, filou† |
| 6b | digraphe on | savon, salon, melon† |
| 6c | digraphe an | maman*, an† |
| 6d | digraphe in | fin, vin†, marin† |
| 6e | digraphe oi | roi, moi°, foi† |
| 6f | digraphe eu | feu*, jeu |
| 7 | digraphes de 3 lettres | eau*, seau*, main, pain, faim, veau†, bain, soleil* |

Contrôle (constaté par exécution) : 65 mots, 0 paire visuelle proche, 0 jumeau phonétique. Présence : **14 au catalogue** (13 avec image, `moi` sans), **51 à créer**. Dans la liste P1 / VOB : 38 sur 65 ; 27 hors liste (†).

### Suite possible : paliers 8 à 12 (20 mots), trop peu de mots P1 « purs »

| Palier | Difficulté | Mots | Limite constatée |
|---|---|---|---|
| 8 | digraphe consonne (ch) | chou, cochon*, chien* | 3 mots imageables (décision JF 2026-11-23, remplacent chéri, fichu, léché) ; ch + un digraphe déjà vu (ou, on, en) ; marché écarté (e/a, CCV) |
| 9 | terminaison /e/ (et, ez) | nez*, jet, jouet, robinet, poulet | |
| 10 | graphie variable (c=s, o fermé) | vélo*, zéro, ici, ciné† | |
| 11 | groupe consonantique (CCV, VCC) | livre*, vivre†, film, avril | |
| 12 | trois syllabes | mimosa†, safari†, salami†, révolu† | fréquence P1 nulle sauf mimosa (44) ; mimosa ajouté le 2026-11-22 à la demande de JF (suite portée à 20 mots) : seul autre candidat du script, « résumé » (abstrait, fréquence 2), écarté |

**Palier final F (décision de JF, 2026-11-20 ; mots ajoutés le 2026-11-22) :** mots contenant é/a, e/a ou è/a ensemble, **uniquement à la fin du pack**, étiquette « paire e/a » (la difficulté reste isolable). Le contrôle de proximité (B2) laisse passer cette exception seulement dans ce palier. JF a demandé « 58 mots si possible » : **impossible**. Le script `tools/pack_progressif_candidats.py final` (socle, toutes consonnes admises, paire e/a) trouve **25 candidats au total** (4 dans la liste P1 de JF, 3 en VOB P3 à P6, 18 hors liste) ; avec les seules consonnes longues du socle il n'en trouve que 3 (lavé, salé, animé). Le lexique P1 ne contient pas plus de mots de ce type.

| Palier | Difficulté | Mots (8, validés par JF le 2026-11-22) |
|---|---|---|
| F | paire e/a (é/a, e/a, è/a) ; consonnes courtes admises (c, p, d) : cumul assumé pour ce palier | déjà, cela, cinéma, café, canapé†, pavé†, pédalo†, mécano† |

Réserve (17 autres candidats, non retenus) : pâté (VOB P3), opéra†, caméra (VOB P6), âgé (VOB P4), lavé†, karaté (VOB P6), salé†, râpé†, karatéka†, municipalité†, nativité†, vitaminé†, animé†, moralité†, ratatiné†, exagéré†, déraciné†. Raisons de non-sélection (déduit) : niveau VOB au-dessus de P1, mots longs ou abstraits, adjectifs difficiles à dessiner honnêtement. « déjà » et « cela » sont des mots-outils : sans image prévue. Fréquence P1 des quatre mots de la liste : déjà 395, cela 301, cinéma 159, café 122.

Consonne double (ll, ss, mm) : aucun mot P1 pur trouvé. À traiter plus tard par un pack « cumul » ou des pseudo-mots (choix humain ou filtre, jamais IA).

**Pour isoler la difficulté d'un élève :** à chaque palier, les mots ne diffèrent du socle que par une difficulté. Option : **paires minimales** (ami/amie, vu/vue, fumé/fumée) qui ne diffèrent que d'un trait.

## 4. Contradictions et incompatibilités à éviter

1. **Digraphes « tous actifs en P1 » et « pas de on/ou ensemble ».** Compatibles seulement si « actif » signifie « reconnu comme une pièce » et non « tous affichés ensemble » : le plateau ne montre que les pièces du mot plus des intrus (constaté). Règle à poser : la proximité visuelle se contrôle sur les pièces **réellement affichées** (mot + intrus).
2. **Digraphes décochés et paires visuelles.** Décocher `ou` fait apparaître o et u ; un mot comme minou (n et u) devient interdit. Le contrôle doit se refaire dans la configuration de la tâche. Les mots eau, seau, veau passent en mode « digraphe actif » et déclenchent e/a si on décoche.
3. **Défaut P2+ « aucun digraphe » et pack de remédiation P1.** Un pack avec des mots à digraphes doit **imposer** les digraphes dont il a besoin, avec message, sinon le mot est impossible à construire. Un seul sens de priorité : le pack l'emporte sur le défaut de niveau, jamais l'inverse.
4. **Audio.** Les états audio du catalogue sont déjà lettre par lettre (constaté : dans = d, da, dan, dans). Si un digraphe décoché demande un autre son pour la lettre isolée, il faut de nouveaux audios [non vérifié] : à mesurer avant de promettre le décochage.
5. **Maternelle et public de la spec.** La spec v0.2 vise P1-P2 ; M1-M3 est une extension de public. À décider, pas à glisser dans le code. Majuscules : affichage seulement, les audios ne changent pas [déduit].
6. **« Consonnes longues d'abord » et ordre des mots.** L'ordre des paliers 1 puis 2 applique la règle ; les paliers 6 et 7 n'ont que des consonnes longues, pour ne pas la violer.
7. **Aucune décision automatique sur l'élève.** Le passage de palier reste la décision de l'enseignant ; l'app montre, elle ne promeut pas.
8. **Choix des mots jamais IA.** La liste ci-dessus vient de filtres ; elle devient pack seulement après validation de JF mot par mot.
9. **Niveaux.** Textes en M1-M3 et P1-P6 uniquement.

## 5. Branches de développement

Chaque branche est testable seule ; l'ordre tient compte des dépendances.

- **B0 — Décisions (aucun code).** Questions section 6. Sans elles, B3 à B6 risquent de se contredire.
- **B1 — Étiquettes de structure d'un mot.** Calcul déterministe, à partir des cubes et sons existants : consonne longue/courte, voyelles, digraphes 2/3/4, lettres muettes, forme (CV, CVC, CCV, VCC), paires visuelles, jumeaux. Chaque étiquette dit pourquoi. Test : les 65 mots du noyau obtiennent exactement leur palier ; les mots écartés obtiennent leur cumul. Base de B2, B3, B4.
- **B2 — Contrôle de liste dans l'Atelier.** Avertissements (pas de blocage) quand une liste de l'enseignant contient une paire proche, un jumeau, un CCV/VCC. L'enseignant garde la décision. S'appuie sur l'analyse de liste existante (`analyseListe`, `rapportListe`) [déduit].
- **B3 — Pack progressif P1.** Données : un pack à **paliers ordonnés**, chaque palier avec sa difficulté. Création des 51 mots manquants par lots de 12 avec le skill `phonoactif-nouveaux-mots` (image, phrase accordée, fiche, audio Azure par JF, publication). Contrainte : image que voit un enfant de 6 ans ; mots-outils et abstraits (mal, sur, vol, vis, lis, foi) sans image, comme dans p1-100. Ordre de production proposé : paliers 1 à 3 d'abord (25 mots, dont 3 au catalogue).
- **B4 — Bilan par type de structure.** Pour chaque élève (code anonyme), taux de réussite et d'aide par palier et par étiquette (ou, on, e muet…). Aucune nouvelle table prévue [déduit, à vérifier au code avant d'annoncer]. Donne à l'enseignant le « où ça coince ».
- **B5 — Réglages de pièces.** Digraphes 2/3/4 cochables (défauts P1 = tous, P2+ = aucun, pack qui impose), majuscules, intrus respectant les paires de Virginie. Demande probablement de nouveaux champs de tâche : migration `phono_` avec grants, **soumise à l'accord de JF** avant exécution. Variante sans migration : réglages dans le lien rapide, comme `&syllabes=`.
- **B6 — Mode maternelle « initiale ».** 3 voyelles au choix (jamais deux voyelles proches), son de la lettre, puis le mot et l'image. Catalogue : **16 mots à initiale vocalique avec image** (ami, âne, arbre, armoire, avec, avion, eau, échelle, école, étoile, hibou, homme, œuf, oiseau, orange, ours). Dépend de B5 (majuscules) et d'un enregistrement des sons de voyelles ; hors décision B0-5, ne pas démarrer.
- **B7 — Extensions, à chiffrer plus tard.** Pack P2 (cumuls un à un), pseudo-mots purs pour les paliers vides, lien avec le jeu physique Lilémo (règle de JF : étudier le lien à chaque développement ; ordre des paliers contre ordre des cubes physiques, non vérifié).

**Ce qui ne doit pas être mélangé :** B5 (réglages) et B3 (contenu) n'ont pas de dépendance ; B6 ne doit pas être livré avant la décision sur le public.

## 6. Décisions de JF du 2026-11-20 (réponses aux 7 questions)

1. Pièce digraphe = pièce unique ; décocher = lettres séparées.
2. é et è comptent comme e pour la règle e/a (les exclusions café, pâté, élan, fâché sont confirmées ; relecture du pack : aucun autre mot concerné, constaté sur la liste).
3. Les règles de proximité s'appliquent aussi aux intrus et aux 3 voyelles de maternelle. **Pas d'intrus en maternelle ; en P1, pas d'intrus par défaut** (l'enseignant peut en ajouter ; alors les règles jouent).
4. « ouil » = 4 lettres : digraphes de 3 lettres = ein, eur, eau, ail, ain, eil, oin ; de 4 lettres = ouil, euil.
5. CVC **après** l'e muet : paliers 3 (e muet) et 4 (CVC) permutés dans le tableau.
6. Maternelle : oui, avec **deux exercices** et un choix du niveau dès l'entrée dans l'app. Interprétation (à confirmer) : exercice « initiale » (3 voyelles) pour M1-M3, exercice « construction du mot » pour P1 et plus.
7. Liste des 65 mots du noyau validée à ce stade (27 mots † compris).

Conséquences : B0 est soldée (reste à confirmer l'interprétation du point 6) ; B3 peut démarrer avec les paliers 1 à 3 ; B5 simplifiée (intrus à 0 par défaut) ; B6 débloquée.

## 7. Non vérifié

- Aucune référence scientifique n'est citée. Si l'app doit justifier consonnes longues/courtes ou CCV/VCC, vérification RISS d'abord (non faite).
- Aucun enfant n'a utilisé ce pack ; l'ordre des paliers est une proposition, pas un résultat.
- Le comportement de l'app n'a pas été exécuté pour ce document (lecture de code et de données seulement).
