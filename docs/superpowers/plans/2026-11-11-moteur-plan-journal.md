# SDD ledger — plan: C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif\docs\superpowers\plans\2026-11-11-moteur-plan.md

Pre-flight: T3 consomme sonDepuisCodes (T2) et classeCube (T1); T5 consomme cubesDepuisEntree (T3), segmenterAuto/Explicite (T1); T6 consomme T3+T5; T7 consomme T5+T6; T8 consomme T5; T9 consomme T2+T3. Aucun conflit trouvé.
Ruling: scripts sdd (task-start/task-done) non utilisés, ledger tenu à la main — le dossier n'est pas un dépôt git avant T1 — coût si faux : aucun.
Ruling: pas de worktree : dépôt neuf créé par T1 step 1 (git init -b main), aucun autre dépôt touché — coût si faux : aucun.
Ruling: scripts npm "test" = `node --test "tests/**/*.test.js"` (glob) au lieu de `node --test tests/` ; un fichier seul se lance par `node --test <fichier>` — Node 24 traite les arguments comme des globs, un dossier nu peut échouer — coût si faux : une ligne de package.json.
Ruling: test de parité (Task 1 step 5) passe dès sa première exécution car le code ES existe déjà (test de caractérisation) ; preuve qu'il peut échouer : copie du HTML avec ç→k, parité 0/1 — coût si faux : aucun.
Task 1: complete (commit 80a1435, tests: LILEMO_HTML=<html> npm test → 8/8 pass ; sans variable : 7/7 + 1 ignoré)
Task 2: complete (commit 870aa11, tests: npm test → 16/16 pass, 1 ignoré sans LILEMO_HTML)
Ruling: « aujourd'hui » absent de ManuLemme (recherche exacte sur ortho) : non inclus dans la fixture ; le test de normalisation de la Task 5 utilise la chaîne directement — coût si faux : un test de moins sur un mot réel.
Task 3: complete (commit d4fba16, tests: npm test → 22/22 pass, 1 ignoré sans LILEMO_HTML)
Ruling: la colonne graphèmes de ManuLemme contient l'annotation « [CC] » (810 occurrences, ex. elle = .e[CC].ll.e) ; elle est retirée avant comparaison avec le mot — constaté sur les données réelles (806 mots rejetés à tort avant correction) ; sa signification (voyelle suivie d'une consonne double) est déduite, non documentée — coût si faux : aucun, l'annotation n'est pas utilisée.
Ruling: les lignes dont phono, graphèmes et codes sont vides (ligne de titre « ManuLemme ver. 2.4 ») sont ignorées sans être comptées en rejet — le plan ne le prévoyait pas ; constaté par 5 tests rouges — coût si faux : aucun.
Task 4: complete (commit d496294, tests: npm run test:py → 7/7 ; données réelles : lus=16004 gardes=16004 rejetes=0, data/ non commité)
Ruling: le test du plan (Task 5) utilisait « c-h-a-t » comme graphèmes explicites invalides, mais ils recomposent « chat » donc sont valides ; remplacé par « c-h-a » (invalide, comme dans test-lilemo.js) — coût si faux : aucun.
Task 5: complete (commit 69ee040, tests: npm test → 32/32 pass, 1 ignoré sans LILEMO_HTML ; node tools/montrer.js : bien/chien i=yod en=in, se e=e_muet, geai ge=j ai=e_ouvert, fille ill=ij, sept p muet, zorbalon source auto à vérifier)
Ruling: le plan (Task 6) testait nbSyllabesMax:1 en excluant « lune », mais ManuLemme compte 1 syllabe pour lune (e final muet) ; le test exclut « petit » (2 syllabes) — coût si faux : aucun.
Task 6: complete (commit 5cdd827, tests: npm test → 41/41 pass, 1 ignoré sans LILEMO_HTML)
Ruling: le plan ne définissait pas « trouves » ; choisi = nombre de lignes dont le mot est dans le lexique (doublons inclus), « parMot » et « liaisonsRequises » portent sur les mots distincts ; les liaisons d'un mot absent (heuristique) ne sont pas comptées — coût si faux : une définition à ajuster.
Task 7: complete (commit bf4a189, tests: npm test → 47/47 pass, 1 ignoré sans LILEMO_HTML)
Task 8: complete (commit c6ae5fc, tests: npm test → 60/60 pass, 1 ignoré sans LILEMO_HTML)
Task 9: complete (commit 7ea3f31, tests: npm test → 63/63 pass, 1 ignoré sans LILEMO_HTML ; node tools/rapport_audio.js : 31/37 sons, manquants exactement e_muet, eu_ouvert, i, o_ferme, o_ouvert, yod)
Final review: self-review (no subagent tool) — relecture des 5 lignes de Review Focus contre les tests (1 absent: T5, 2 casse: T2+T6, 3 saisies sales: T5+T7, 4 doublons: T5+T6, 5 code inconnu: T3) et essai sur les 16004 entrées réelles (0 exception) et sur la liste P1 de JF (3001/3001 trouvées, 165 à vérifier).
Final: minor (deferred): 874 entrées ManuLemme (5,5 %) ont un code phonétique non traité — « 8 » seul (306, ex. lui, nuit), composites Ej (soleil), waj (voyage), w5 (loin), gz (exercice), ER (hiver), il (ville), G, kw… — signalées « à vérifier » et jamais proposées par filtrerMots ; décision à prendre par JF sur la façon de les faire entendre (sons composés).
Final: minor (deferred): mots à plusieurs mots ou apostrophe (« pomme de terre », « aujourd’hui », absent de ManuLemme) passent par l'heuristique avec un cube pour l'espace ou l'apostrophe.
Final: minor (deferred): le plan fixe l'e muet à l'id e_muet pour le schwa : le fichier son e_muet n'existe pas encore (6 sons manquants).
Final: no Critical/Important finding — aucune correction nécessaire.
