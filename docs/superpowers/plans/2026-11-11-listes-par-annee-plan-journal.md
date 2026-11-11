# SDD ledger — plan: C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\docs\superpowers\plans\2026-11-11-listes-par-annee-plan.md

Pre-flight: T2 consomme creerListe (T1) ; T3 consomme T1 + segmenterMot/liaisonsDe (existants) ; T4 consomme T1+T3 ; T5 consomme T1+T3+filtrerMots ; T6 consomme T5 + segmenterMot ; T7 consomme T1 + fileDeRevue. Aucun conflit trouvé.
Ruling: ledger tenu à la main, dépôt local main existant, pas de worktree (comme les plans précédents).
Ruling: pour un niveau vide le message est « <mot> : niveau manquant » (le plan prévoyait « niveau inconnu «  » », illisible) — coût si faux : une phrase.
Task 1: complete (commit f8bcb1a, tests: npm test → 151/151, 1 ignoré sans LILEMO_HTML)
Ruling: le dossier C:\Users\jfbeg\Downloads\VOB\ n'existe plus (déplacé ou supprimé après 12:05) : l'extracteur Python n'a donc PAS été lancé sur le fichier réel ; construire_liste.js a été vérifié sur la copie de travail vob.json (extraite du même tableur plus tôt, mots sans espaces de fin) — coût si faux : refaire l'extraction à l'emplacement actuel du fichier.
Task 2: complete (commit 02c4ded, tests: npm test → 154/154 + npm run test:py → 12/12 ; réel : 3457 lignes brutes -> 3435 entrées (P1 52, P2 167, P3 800, P4 975, P5 878, P6 563), 8 avertissements (mots en deux années : car, sur, capital, commune, fier, guetter, travail…), refus sans licence code 2)
Task 3: complete (commit ac8fcde, tests: npm test → 164/164, 1 ignoré sans LILEMO_HTML)
Task 4: complete (commit 48d044e, tests: npm test → 169/169, 1 ignoré sans LILEMO_HTML ; réel VOB : 3435 mots, 2937 trouvés, 498 absents, 673 à vérifier, 86 multi-mots, 134 liaisons distinctes ; P1 : 52 mots dont 46 trouvés, 47 liaisons nouvelles ; écart avec l'analyse préliminaire (2933 lignes trouvées sur 3457) dû à la fusion des variantes et des doublons d'années)
Task 5: complete (commit 5166d42, tests: npm test → 179/179, 1 ignoré sans LILEMO_HTML ; réel VOB : proposerPourNiveau fonctionne en quelques ms, voir détail dans le compte rendu)
Task 6: complete (commit 0ab080c, tests: npm test → 189/189, 1 ignoré sans LILEMO_HTML ; réel : pack P2 du VOB à tolérance 2 = 141 cartes, ids et noms de fichiers uniques, CSV avec BOM et graphèmes proposés (dans = d.an.s, chien = ch.i.en) ; refus sans licence code 2 ; dossier packs/p2-essai supprimé ; ouverture du CSV dans Excel non vérifiée)
Task 7: complete (commit 57a2244, tests: LILEMO_HTML=<html> npm test → 194/194 ; npm run test:py → 12/12 ; réel : node tools/revue_liste.js --liste data/listes/vob.json → file de 1321 mots = 823 à code inconnu + 498 absents du lexique (dont 86 multi-mots) ; page de revue générée avec la liste sans erreur)
Final review: self-review (no subagent tool) — Review Focus relu contre les tests : 1 saisies du tableur (T1), 2 années multiples et doublons (T1), 3 niveau vide ou hors liste et colonnes facultatives (T1, T2), 4 mots à vérifier exclus mais listés (T3), 5 collisions de noms de fichiers (T6) ; essais sur le VOB réel (copie de travail) à chaque étape.
Final: minor (deferred): l'extracteur Python n'a pas été lancé sur le fichier VOB réel (dossier Downloads\VOB disparu) ; data/vob-brut.json vient de la copie de travail extraite plus tôt (mots sans espaces de fin).
Final: minor (deferred): 8 mots présents dans deux années du VOB (car, sur, capital, commune, fier, guetter, travail…) sont gardés à l'année la plus précoce : choix du plan à confirmer par JF.
Final: minor (deferred): pour P1, rien n'étant connu avant P1, proposerPourNiveau à tolérance 0 ne propose aucun mot ; utiliser une tolérance (3 à 5) ou jusquAuNiveau.
Final: minor (deferred): 498 mots du VOB absents de ManuLemme (ils, elles, cœur, elle-même, féminins et accords) : règle de dérivation non faite ; ils passent par la revue.
Final: minor (deferred): ouverture du CSV a-fabriquer.csv dans Excel (accents, séparateur « ; ») non vérifiée.
Final: no Critical/Important finding — aucune correction nécessaire.
