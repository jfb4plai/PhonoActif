# Limites à afficher dans l'app (BROUILLON, 2026-11-12)

Demande de JF : signaler clairement les limites avant toute utilisation. Chaque phrase cite sa source ; une phrase sans source mesurée ne doit pas être publiée.
Emplacement prévu : écran d'accueil de l'enseignant (version complète) et bouton « Limites » toujours visible dans le jeu (version courte). Pas côté élève.

## Version courte (jeu)
« La lecture est calculée par des règles : elle est juste pour environ 9 mots sur 10 et peut se tromper. Si tu entends une erreur, signale-la à l'enseignant. »

## Version complète (enseignant)

| # | Limite | Source (constaté) |
|---|---|---|
| 1 | Les règles lisent comme ManuLemme 93,3 % de 6575 mots réels jamais regardés pendant leur écriture (96,3 % sur les 881 mots de P1 qui ont servi à les écrire). Pour les pseudo-mots, aucune mesure : rien ne dit que 93 % s'applique. | `node tools/mesurer_regles.js` ; docs/rapport-regles-vs-manulemme-p1.md |
| 2 | Restent mal lus : o et eu ouverts ou fermés (trop, peur), lettres finales prononcées (plus, dix, sept), mots étrangers ou savants, femme, monsieur. | rapport ci-dessus |
| 3 | Environ 45 % des erreurs ne sont pas signalées par l'app : une lecture fausse peut ressembler à une lecture juste. | même mesure (« erreurs NON signalées ») |
| 4 | Pendant la construction d'un mot, chaque état est lu par les règles, même si ce qui est posé est un mot. Seul l'état final utilise le lexique. Un changement de son à la dernière lettre est normal (peu, puis peur). | décision de JF, `src/core/etats.js` |
| 5 | Le lexique (ManuLemme, 16 004 entrées) ne contient que des lemmes : pas de pluriel, pas de conjugaison, pas de féminin accordé. Un mot « non trouvé » n'est pas un mot faux. | à re-vérifier avant publication : 224 formes féminines ou accordées absentes de la liste VOB (mémoire du projet, non rejoué) |
| 6 | Les verbes en -ent (ils parlent) sont lus comme des noms (/ɑ̃/) : choix signalé `ambigu`. Le e instable (petit, demain) et la lettre finale muette par règle (mais, lup) sont aussi signalés. | `src/core/regles.js`, tests/core/regles.test.js |
| 7 | La voix (Charline, fr-BE) a été écoutée par JF sur un échantillon : 37 sons, 20 syllabes, 20 pseudo-mots, 16 états. Les autres combinaisons n'ont pas été écoutées. | essai-tts-ipa/ecoute*.html |
| 8 | Le son d'une combinaison non préparée est produit en direct et demande une connexion. Hors ligne, seule la bibliothèque mise en cache est jouée ; sinon, pas de son. | décision de JF 2026-11-12 ; bibliothèque non encore construite |
| 9 | Chaînes de 8 lettres au plus. | hypothèse issue des 8 cases du Lilémo physique, à confirmer |
| 10 | Aucun effet sur l'apprentissage n'est démontré. Le mode « lettre par lettre avec changement rétroactif » est un choix de conception de JF ; aucune référence RISS directe trouvée (recherche du 2026-11-12). | mémoire du projet |
| 11 | 60 mots de P1 ont des codes phonétiques ManuLemme non traités (lui, nuit, loin, ville…) : lecture à valider à la main. | rapport ci-dessus |

Règle de rédaction : version enseignant en phrases courtes, pas de jargon (« règles » = « un programme qui lit les lettres selon des régularités »).
