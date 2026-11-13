# Lexique 4.1 (lexique.org) : téléchargement, contenu, comparaison (2026-11-12)

## Téléchargé (accord de JF)
`https://www.lexique.org/databases/Lexique410/Lexique4.1.zip`, 48 896 901 octets (taille annoncée par le serveur et constatée). Dossier : `data/lexique-org/` (non commité). Extrait : `Lexique4.1.tsv` (34 Mo), `Lexique4.pdf` (manuel, 678 Ko), `README-Lexique.txt`. Le fichier `.xlsx` (36 Mo) est resté dans l'archive. Aucun code de l'archive n'a été exécuté.

## Licence : NON levée
La page lexique.org affiche « Creative Commons Attribution – Partage dans les mêmes conditions 4.0 » (CC BY-SA) mais le lien pointe vers `creativecommons.org/licenses/by-nc/4.0/` (CC BY-NC). Le README ne la précise pas. À éclaircir auprès des auteurs avant toute redistribution de données dérivées ; usage local de comparaison seulement d'ici là.

**Contexte d'usage de PhonoActif (à mentionner dans toute demande ou attribution) :** outil **non commercial**, gratuit pour les enseignants, destiné à des **élèves à besoins spécifiques** (dyslexie, dyscalculie, TDAH, troubles d'apprentissage ; Pôle Territorial de la Ville de Liège, Fédération Wallonie-Bruxelles), publié sous licence PolyForm Noncommercial (LICENSE posée le 2026-10-03).
- Si la licence réelle est **CC BY-NC 4.0** : l'usage non commercial est prévu par la licence, avec attribution (New, Pallier et al., Lexique 4). Reste à confirmer, auprès des auteurs, que l'usage dans un outil pédagogique public est bien « non commercial » au sens de la licence : non vérifié, ce n'est pas un avis juridique.
- Si elle est **CC BY-SA 4.0** : usage permis avec attribution, mais toute donnée dérivée redistribuée doit l'être sous la même licence, ce qui peut gêner un lexique publié avec l'app.
- Dans les deux cas : les données Lexique restent hors du dépôt public tant que ce n'est pas tranché (`data/` n'est pas commité).
- Suggestion : écrire aux auteurs (Boris New, Christophe Pallier), en indiquant ce contexte non commercial et le public visé, pour obtenir la licence par écrit.

## Contenu (constaté)
189 863 lignes, 170 783 formes distinctes, 37 colonnes : Mot, Phono (code à un caractère par phonème, même famille que ManuLemme : @ § 5 S Z N R 8 °), Phono_IPA, Lemme, Cgram, Genre, Nombre, InfoVER, fréquences, SyllPhono (syllabation phonologique), SyllNb, SyllCV, structure morphologique, prévalence, temps de décision lexicale.
- Les 941 mots de P1 y sont tous.
- Formes fléchies présentes : chats (mp), maisons (fp), petites, grandes, chevaux, mangeons, mangent, adapteriez. Cela lèverait la limite « pas de pluriel » de ManuLemme (lemmes).
- 395 lignes ont une colonne Phono hors du code attendu (feeder = « NOM », glioblastomes, puddings, longboard : mots étrangers, caractères G et J, une ligne décalée).

## Prononciation : ManuLemme reste la référence
Sur 15 791 mots communs, la phonologie est identique (hors e muet) pour 13 258 (84,0 %). Sur les désaccords examinés (14 mots), ManuLemme est conforme à la prononciation standard et Lexique 4.1 non : ce = /sø/ (ManuLemme /sə/), peur = /pøʁ/ (ManuLemme /pœʁ/), chocolat = /ʃokola/ (ManuLemme /ʃɔkɔla/), donner = /done/ (ManuLemme /dɔne/), robot, moment. Lexique 4.1 semble neutraliser o/ɔ et ø/œ dans une partie du lexique. Échantillon petit, non systématique : jugement de JF requis avant toute reprise de ces transcriptions.

## Syllabation : contrôle externe de src/core/syllabes.js
Comparée à la colonne SyllPhono sur 165 432 mots :
- version initiale (attaque maximale, sans ajustement) : 98,5 % identique (hors échantillon, première mesure) ;
- après trois ajustements dérivés des désaccords (s + occlusive après le k de x ; pas de groupe consonne + liquide devant une glissante sauf t et d ; x décomposé en k + s) : **99,7 %** (164 949 mots). Ce chiffre est en partie ajusté sur le même jeu : le 98,5 % est le seul hors échantillon.
- reliquat (483 mots) : mots étrangers (skateboard, milkshake), athlète, yod après wa (voyiez).
Cela mesure l'accord avec Lexique, pas la justesse phonologique.

## Suite possible (à décider par JF)
1. Utiliser Lexique pour reconnaître les formes fléchies (existence, lemme, genre, nombre) en gardant la phonologie de ManuLemme pour les formes régulières (pluriels) : sans reprendre les transcriptions de Lexique. Verbes conjugués : phonologie de Lexique à valider.
2. Fréquences de sous-titres pour prioriser les syllabes.
3. Éclaircir la licence.
