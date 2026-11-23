# Lot 19 (pack progressif P1, paliers 7 à 10) : fiche d'intention v2, À VALIDER par JF (2026-11-23)

Statut : proposition, aucune image générée, aucune fiche créée. v2 : JF a demandé de remplacer minet, sujet, fichu, volet et sein (pas du langage quotidien d'un élève de P1). Les remplaçants viennent d'un filtre sur data/lexique.json et sur la liste P1 de JF (data/p1-mots.json), pas d'un choix de l'IA. Les 12 mots sont absents du catalogue (constaté dans public/mots/catalogue.json, 234 mots). Claude ne juge que « se dessine-t-il honnêtement ? ». Phrases proposées, à valider avant l'audio.

## Remplacements proposés (5)

| Sorti | Palier | Remplaçant | Fréquence P1 (ManuLemme) | Statut dans la liste P1 de JF | Pourquoi lui |
|---|---|---|---|---|---|
| sein | 7 | **bain** (b ain) | 157 | oui | digraphe `ain` de 3 lettres ; mot de la maison (« prendre un bain »). Cumul : b est une consonne courte (pain, déjà dans ce palier, aussi). Autre option : **nouveau** (n ou v eau, 97, liste P1) : `eau` + `ou` déjà vu au palier 6a |
| fichu | 8 | **marché** (m a r ch é) | 73 | oui | digraphe `ch` ; mot de la vie de famille (« aller au marché »). Cumul : é accentué. Autre option : **chef** (ch e f, 67, liste P1) ; **cheval** est déjà au catalogue mais contient e et a (paire réservée au palier F) |
| volet | 9 | **jouet** (j ou et) | 79 | oui | terminaison `et` ; mot de la maison et de l'école. Cumul : digraphe `ou` déjà vu au palier 6a |
| minet | 9 | **laver** (l a v er) | 140 | oui | terminaison /e/ écrite `er` (le palier disait « et, ez » : extension à `er`, **à valider**) ; verbe de la vie quotidienne (« se laver les mains ») |
| sujet | 9 | **filet** (f i l et) | 65 | oui | terminaison `et`, consonnes longues seules (aucun cumul) ; mot du foot et de la pêche |

Autres candidats du palier 9 trouvés par le filtre, non retenus : voler (déjà « vol » au palier 4), amuser (64), rouler (54), mer et fer (se prononcent /ɛʁ/, pas /e/ : écartés).
Palier 8 : le filtre ne trouve que 9 mots en `ch` sans autre difficulté (cheval, marché, chef, char, écho, fichu, réfléchir, chéri, fâché) ; seuls cheval, marché et chef sont de la vie d'un élève de P1.

## Les 12 mots du lot

| Mot | Palier | Ce que voit un enfant de 6 ans | Couleur / forme | Phrase d'aide (mot cible tel quel) | Risque / décision |
|---|---|---|---|---|---|
| faim **?** | 7 | abstrait (sensation) ; une assiette vide se lit « assiette » | — | J'ai faim, je veux manger. | Proposé : **sans image** |
| veau † | 7 | un veau debout, de profil : petit corps brun clair, longues pattes fines, petites oreilles, museau rose, pas de pis | pelage #c89b6d, museau #f2b8a8, sabots #6b4a2f ; un seul œil (profil) | Le veau court dans le pré. | se lit « vache » (au catalogue), « chien » ou « agneau » : pattes longues et fines, taille petite, pas de taches noires ; **image : OK de JF** |
| bain **?** | 7 | une baignoire pleine de mousse se lit « baignoire » ou « mousse » (déjà « savon » avec mousse) | — | Je prends un bain chaud. | Proposé : **sans image** |
| sain † **?** | 7 | abstrait (en bonne santé) ; une pomme se lirait « pomme » (au catalogue) | — | Un fruit est un repas sain. | Proposé : **sans image** |
| chéri † **?** | 8 | un mot affectueux ; un cœur se lirait « cœur » | — | Maman dit « mon chéri » à bébé. | Proposé : **sans image** |
| marché **?** | 8 | un étal avec un auvent rayé et des cageots : plusieurs sujets, se lit « fruits » ou « tente » | — | Maman va au marché. | Proposé : **sans image** |
| léché † **?** | 8 | participe d'un verbe ; un chat qui lèche se lit « chat » | — | Le chat a léché son bol. | Proposé : **sans image** |
| jet **?** | 9 | un arc d'eau sortant d'un tuyau se lit « tuyau » ou « arrosoir » ; autre sens (jet d'avion) | — | Le jet d'eau monte très haut. | Proposé : **sans image** |
| jouet **?** | 9 | un jouet quelconque se lit « ours », « train » ou « voiture » (aucun ne dit « jouet ») | — | Je range mon jouet. | Proposé : **sans image** |
| laver **?** | 9 | deux mains sous un robinet : se lit « mains » ou « robinet » (au catalogue) | — | Je dois laver mes mains. | Proposé : **sans image** |
| filet **?** | 9 | un filet de but ou de pêche : se lit « but » ou « épuisette » ; un filet seul n'a pas de forme reconnue | — | Le ballon est dans le filet. | Proposé : **sans image** |
| zéro | 10 | le chiffre 0, seul, grand (règle de JF du 2026-11-15 : un nombre = le chiffre seul) | chiffre #1f3a5f sur papier crème #efe6d0, ombre douce ; aucun texte autre que le chiffre | Il y a zéro bonbon dans le sac. | se lit « o » ou « rond » : ovale étroit, pas un cercle ; **image : OK de JF** |

Bilan : **2 images à générer** (veau, zéro) et **10 mots sans image** (faim, bain, sain, chéri, marché, léché, jet, jouet, laver, filet). Aucun des 5 remplaçants ne se dessine honnêtement : les 10 « sans image » sont des propositions, décision mot par mot.

## À décider par JF
1. Les 5 remplaçants : bain, marché, jouet, laver, filet ? Sinon l'alternative (nouveau / chef) ou un autre mot.
2. Le palier 9 admet-il `er` (laver) en plus de `et` et `ez` ?
3. Les 10 « sans image » : tous d'accord, ou une image pour l'un (lequel) ?
4. Les 12 phrases.
Rien n'est lancé avant ta validation. Le plan (docs/plan-apport-virginie-pack-progressif.md, plan-ajouts) n'est pas encore modifié : je le mets à jour après ta réponse.
