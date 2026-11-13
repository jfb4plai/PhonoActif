# Règles graphème→son contre ManuLemme, 941 mots de P1 (2026-11-12)

Commande : `node tools/comparer_regles_manulemme.js` (mots : `data/p1-mots.json`, extraits de « 1000 mots les plus fréquents en P1.xlsx », 941 distincts).
« Règles » = `segmenterAuto` (table `SON_PAR_DEFAUT` + 5 règles de contexte). « Référence » = ManuLemme 2.4 converti en sons Lilémo.

## Constaté (sortie du script)

| | Mots |
|---|---|
| Comparables | 881 |
| Lecture identique | 514 (58,3 %) |
| Écart | 367 |
| Non comparables (code ManuLemme non traité : `8i`, `w5`, `Ej`, `ER`, `ij`, `vil`…) | 60 |

Parmi les 60 non comparables : lui, nuit, loin, point, soleil, ville, mer, hiver, voyage, pays. Mots courants, à trancher avec la file de revue.

## Causes des écarts (segmentation identique, 109 mots ont une segmentation différente)

| Cause | Occurrences (un mot peut en cumuler plusieurs) | Exemples |
|---|---|---|
| e lu schwa, devrait être è | 64 | elle, avec, terre, quel |
| i lu i, devrait être yod | 52 | bien, chien, rien |
| e muet lu schwa (règle « e final » seule) | 18 | maintenant, chemin |
| e du monosyllabe lu muet, devrait être schwa | 49 | le, de, je, se, ne |
| lettre finale prononcée, devrait être muette (t 36, s 15, d 15, p 6, g 3, c 2, l 2…) | ~80 | vent, dans, quand, grand |
| o lu ouvert, devrait être fermé | 24 | trop, gros, vélo |
| eu lu fermé, devrait être ouvert | 20 | peur, leur, heure |
| en lu an, devrait être in (ien) | 7 | bien, chien |
| t lu t, devrait être s (-tion) | 5 | attention |
| autres isolés (ou→w, ij, femme, monsieur…) | ~20 | oui, crier, femme |

Segmentation : ManuLemme traite er, ez, et, ill, où, oî comme un seul graphème (nez, aller, fille, boîte) ; les règles les coupent. Quand les sons coïncident, la segmentation coïncide aussi (1 mot sur 514 fait exception).

## Déduit (mon jugement, non mesuré)

- Une table de ~250 correspondances seule donne 58 %. Elle ne suffit pas.
- Une grande part des écarts est **contextuelle** et réparable par des règles : e + consonne → è, i + voyelle → yod, lettres finales muettes, e des monosyllabes, -tion, -ier/-er/-ez, ill. Elle représente la majorité des 367.
- Une part est **lexicale** : o ouvert ou fermé (trop / pomme), eu ouvert ou fermé (peur / feu), femme, monsieur, clown. Aucune règle ne les donne, il faut une liste d'exceptions.
- Conséquence pour l'app : mots réels = ManuLemme + corrections, pseudo-mots = règles contextuelles + exceptions signalées. Le taux réel d'une version améliorée des règles est **non vérifié** tant qu'elle n'est pas écrite et mesurée.

## Fichiers

- `docs/ecarts-regles-manulemme.csv` : un mot par ligne, lecture des deux côtés
- `docs/causes-ecarts-regles.csv` : causes agrégées avec exemples
- `docs/motifs-hors-defaut.csv` : graphèmes dont ManuLemme s'écarte du son par défaut

## Règles contextuelles v1 (2026-11-12, `src/core/regles.js`, mesure : `node tools/mesurer_regles.js`)

Écrites d'après les écarts ci-dessus, puis testées sur ManuLemme (mots à code connu et segmentation cohérente). Le « hors P1 » (13 169 mots de fréquence P1-P5) est coupé en deux moitiés fixes : A (rang pair) a servi au diagnostic ; B (rang impair) n'a jamais été regardée, seul son taux a été lu.

| Jeu | Mots comparables | Ancien `segmenterAuto` | Règles v1 | Erreurs non signalées |
|---|---|---|---|---|
| P1 (a servi à écrire les règles) | 881 | 58,3 % | 96,5 % | 14 sur 31 |
| Hors P1, moitié A (diagnostic) | 6594 | 39,5 % | 93,6 % | 190 sur 421 |
| Hors P1, moitié B (jamais regardée) | 6575 | 39,7 % | 93,4 % | 181 sur 435 |

Lecture : 93,4 % est la meilleure estimation de ce que les règles feront sur des mots réels qu'elles n'ont pas vus. Restent faux, par construction : o et eu ouverts ou fermés, lettres finales prononcées (plus, dix, direct, sept), mots étrangers ou savants, femme, monsieur. Les mots à codes ManuLemme non traités (60 en P1) restent hors mesure.

`ambigu: true` signale : e instable (petit, demain), lettre finale muette par règle (mais, lup), -ent final. Environ 45 % des erreurs restantes ne sont pas signalées (14/31, 190/421, 181/435) : l'enseignant ne les verrait pas.
Mesure sur ManuLemme = écart de lecture avec un lexique, pas jugement d'une oreille : les états du mode A (« mè », « mèzo ») restent à écouter par JF.
