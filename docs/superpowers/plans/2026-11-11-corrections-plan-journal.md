# SDD ledger — plan: C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\docs\superpowers\plans\2026-11-11-corrections-plan.md

Pre-flight: T2 consomme sonValide (T1) ; T3 consomme T2 ; T4 consomme T2+T3 ; T5 consomme T1+T2+T3 ; T6 consomme T2+T5 ; T7 consomme T5+T6 ; T8 consomme tout. Aucun conflit trouvé.
Ruling: ledger tenu à la main, pas de worktree (dépôt local main existant), comme pour le plan précédent.
Ruling: sonValide/composants utilisent Object.hasOwn (un test rouge a montré que « constructor » passait pour un son valide avec l'opérateur in) — coût si faux : aucun.
Task 1: complete (commit 123b973, tests: LILEMO_HTML=<html> npm test → 69/69 ; rapport audio : 6 manquants eu_ouvert, i, o_ferme, o_ouvert, schwa, yod)
Task 2: complete (commit 617732a, tests: npm test → 81/81, 1 ignoré sans LILEMO_HTML)
Task 3: complete (commit 5c5f99a, tests: npm test → 91/91, 1 ignoré sans LILEMO_HTML ; aucun test existant adapté)
Ruling: filtrerMots exclut aussi les entrées multi-mots du LEXIQUE (ex. peut-être) tant qu'elles n'ont pas de correction valide — le plan ne citait que les mots présents seulement dans les corrections ; exigence de JF « les mots à plusieurs mots seront à valider » — coût si faux : quelques mots à trait d'union non proposés avant validation.
Ruling: analyserListe : absents = mots hors lexique SANS correction valide ; aVerifier = résultat de segmenterMot — cohérent avec la priorité des sources — coût si faux : une définition à ajuster.
Task 4: complete (commit ba82eca, tests: npm test → 100/100, 1 ignoré sans LILEMO_HTML)
Ruling: deriveDuLexique compare la correction valide à la PROPOSITION du lexique (proposerCubes) et non aux cubes bruts (le plan disait cubesDepuisEntree) — sinon valider une proposition de décomposition (x=g+z) serait signalé comme dérive pour toujours — coût si faux : aucun.
Ruling: fileDeRevue garde aussi toute correction a_valider absente du lexique et de la liste fournie (raison « correction à valider ») — le plan ne le précisait pas ; évite qu'une proposition enregistrée se perde — coût si faux : aucun.
Task 5: complete (commit 3a82d6f, tests: npm test → 112/112, 1 ignoré sans LILEMO_HTML)
Ruling: importerCorrections (fonction testable) ajoutée à src/node/corrections.js, la commande ne fait que l'appeler ; elle refuse d'écrire si le fichier existant contient des corrections invalides (sinon la réécriture les supprimerait en silence) — non prévu au plan — coût si faux : un message d'erreur de plus.
Task 6: complete (commit 6cf4a43, tests: npm test → 121/121, 1 ignoré sans LILEMO_HTML ; node tools/revue_liste.js : file de 823 mots distincts (874 lignes de ManuLemme, doublons de classe), 0 multi-mots dans ManuLemme, 0 correction, 0 dérive ; propositions affichées pour soleil, loin, ville, hiver, voyage, exercice)
Ruling: le séparateur du champ Graphèmes de la page est le POINT (s.o.l.eil) et non le trait d'union du plan : un trait d'union est un caractère de certains mots (peut-être), le point ne l'est pas ; la page pré-remplit le champ, JF n'a qu'à le corriger — coût si faux : placeholder et aide à changer.
Ruling: la logique pure de la page vit dans src/revue/logique.js (testée par 10 tests Node) et est copiée sans « export » dans la page ; src/revue/interface.js (DOM) n'est testable qu'au navigateur, voir Task 8 — non prévu au plan — coût si faux : aucun.
Task 7: complete (commit fe07849, tests: npm test → 139/139, 1 ignoré sans LILEMO_HTML ; partie DOM non testée avant Task 8)
Ruling: le navigateur intégré refuse localStorage et n'enregistre pas les téléchargements : la sauvegarde automatique au rechargement et le téléchargement réel sont NON vérifiés (message d'avertissement vu à l'écran ; contenu exact du fichier exporté capturé par interception du Blob puis importé avec succès) — consignés dans la recette pour JF — coût si faux : une recette à refaire dans Chrome.
Task 8: complete (commit 3b6a8a0, tests: LILEMO_HTML=<html> npm test → 140/140 ; npm run test:py → 7/7 ; parcours réel dans le navigateur intégré : page ouverte en file://, aucune erreur console, lui corrigé, soleil validé tel quel, export vérifié, import 823 → 821 mots, import d'un fichier illisible refusé avec code 1)
Final review: self-review (no subagent tool) — Review Focus relu contre les tests : 1 correction invalide rejetée (T2, T6), 2 fusion (T2, T6), 3 séparateurs (T3), 4 dérive (T5), 5 file longue : page 0,08 Mo pour 300 mots, son absent géré par onerror (non entendu), brouillon non vérifié (stockage refusé dans le navigateur intégré).
Final: minor (deferred): src/revue/interface.js (DOM) n'a aucun test automatique ; seule la logique pure (10 tests) et un parcours manuel dans le navigateur intégré la couvrent.
Final: minor (deferred): la date des corrections est la date UTC (toISOString) : décalage d'un jour possible entre minuit et 1-2 h du matin en heure belge.
Final: minor (deferred): les 306 entrées au code « 8 » seul (lui, nuit, puis, pluie…) n'ont aucune proposition automatique : JF choisit le son à la main (essai : u pour lui).
Final: minor (deferred): un « valider tel quel » d'un mot à son composé (fille : ij) exporte i+yod, équivalent mais écrit autrement ; sans effet sur la dérive (comparaison faite après développement).
Final: no Critical/Important finding — aucune correction nécessaire.
