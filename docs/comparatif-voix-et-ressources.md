# Comparatif : Charline, Lingua Libre, Le Dico des écoles (2026-11-12)

Légende des statuts : **constaté** (vu dans un fichier, une mesure ou une réponse d'API aujourd'hui), **déduit** (calcul ou raisonnement à partir de constats), **non vérifié** (rien lu qui le prouve), **à mesurer** (protocole proposé).

## 1. Voix : Charline (Azure, IPA) ou Lingua Libre (voix humaines) ?

| Critère | Charline (fr-BE-CharlineNeural, IPA) | Lingua Libre (enregistrements de bénévoles, Commons) |
|---|---|---|
| **Ce qu'on peut faire dire** | Tout ce dont on a l'IPA : sons isolés, syllabes, pseudo-mots, états lettre par lettre. **Constaté** : 37 sons, 20 syllabes, 20 pseudo-mots, 16 états écoutés par JF, tous bons sauf vélu (erreur d'IPA de Claude, corrigée) et un é de « ré » un peu moins franc | Des **mots entiers** enregistrés. **Constaté** : noms de fichiers « LL-Q150 (fra)-Locuteur-mot.wav ». Pas de pseudo-mots, de syllabes isolées ni de sons isolés (non vérifié : aucune liste de ce type vue) |
| **Mots belges et liégeois** | Voix belge (**constaté**). Elle lit ce qu'on lui donne en IPA : l'IPA d'un belgicisme ou d'un mot wallon n'est pas dans ManuLemme (non vérifié) ; les règles lisent 93,3 % des mots réels courants, **non mesuré sur des belgicismes**. Couche de corrections de JF disponible (**constaté** : `corrections.js`) pour fixer la lecture à la main | Dépend de la présence d'un locuteur belge et du mot : **non vérifié**. Le pays du locuteur n'est pas sur Commons (**constaté**), il est sur lingualibre.org (503 aujourd'hui). Le wallon a sans doute ses propres enregistrements (non vérifié) |
| **Exactitude** | Dépend de l'IPA fourni : toute erreur de table s'entend (vélu). Règles 93,3 % sur 6 575 mots jamais vus, ManuLemme exact pour son lexique (**constaté**). Mesure indicative : F1 de /ʁe/ 449 Hz contre 336 à 378 pour les autres /Ce/ (**constaté**, indicatif) | Prononciation humaine naturelle, mais **qualité hétérogène** (bruit, niveau, accent) et pas de contrôle central : **non mesuré**. Plusieurs locuteurs par mot (**constaté** : 28 fichiers pour « maison », 38 « chat », 82 « petit », 74 « pomme ») : choix à faire |
| **Coût** | Quota gratuit F0 : 0,5 million de caractères par mois (page Azure, **constaté** par recherche). Au-delà, environ 15 à 16 $ par million (sources tierces, **non vérifié**). Bibliothèque de 2 788 fichiers : environ 209 000 caractères si seul le corps du SSML est compté, 580 000 si tout l'est (**calculé** ; règle de facturation **non vérifiée**). Le direct consomme en plus | Gratuit (licence libre). Coût réel : temps d'intégration (téléchargement, conversion WAV → mp3, crédits). **Constaté** : un fichier WAV de mot fait 91 Ko ; 941 mots ≈ 86 Mo en WAV, environ 10 Mo en mp3 (**déduit**) |
| **Licence** | Audio généré : conditions Microsoft de redistribution dans une app **non vérifiées** | Par fichier : **constaté** CC BY 4.0 sur un fichier (attribution du locuteur obligatoire) ; JF indique CC0, CC BY ou CC BY-SA. Une normalisation ou un rognage est une adaptation (BY-SA : même licence). Crédits à afficher |
| **Hors ligne** | Bibliothèque en cache pour l'attendu (2 788 fichiers ≈ 12 Mo, **déduit** : 4,5 Ko mesurés en moyenne), direct si connecté | Fichiers téléchargeables et mis en cache, une fois les mots choisis |
| **Cohérence de la voix** | Une seule voix du début à la fin | Voix multiples : variété utile ou gênante (**non testé**) ; changement de voix à la dernière lettre si seul le mot final est humain |
| **Données personnelles** | Aucune donnée d'élève envoyée (l'IPA seulement) | Voix de bénévoles identifiables par leur pseudo : attribution requise |
| **Pérennité** | Service commercial : une voix peut évoluer ou être retirée (non vérifié) | Projet associatif de Wikimédia France. **Constaté aujourd'hui** : lingualibre.org et son endpoint SPARQL répondent 503 ; l'API de Commons limite le débit (429) |
| **Couverture de P1** | 881 des 941 mots de P1 lus directement avec ManuLemme, 60 à valider à la main (codes non traités) ; le palier 4 de la bibliothèque (2 788 fichiers) couvre 100 % des mots de ManuLemme (**calculé**) | **Non mesurée** : site 503, requêtes de recherche limitées. Un index des titres (400 000 fichiers) est en cours de constitution, sans pression sur l'API |

**Lecture honnête :** Lingua Libre ne remplace pas Charline pour le cœur de l'app (syllabes, pseudo-mots, combinaisons, états). Il pourrait la compléter pour des **mots entiers réels**, si la couverture et la qualité (y compris belge) sont au rendez-vous. C'est ce que mesurera l'index.

### Protocole pour trancher (à mesurer)
1. **Couverture** : proportion des 941 mots de P1, de VOB et d'un échantillon de belgicismes (BDLP, 2 035 formes) ayant au moins un fichier. Hors ligne, à partir de l'index.
2. **Écoute croisée** : 30 mots (10 P1, 10 belgicismes, 10 mots difficiles) en Charline et en Lingua Libre, notés par JF : juste / accent / clarté.
3. **Décision** par mot : Charline seule, Lingua Libre seule, ou les deux (JF choisit).

## 2. Le Dico des écoles et PhonoActif : concurrence ou complémentarité ?

Source : le site lui-même, lu le 2026-11-12 dans le navigateur de JF (pages Recherche, Pour les enseignants, Crédits, Mentions légales). Tout ce qui suit est **constaté sur ces pages**, sauf mention contraire. La recherche automatisée avait échoué (403) : le site refuse les robots, pas les lecteurs.

**Qui :** Franck Rouillé, professeur des écoles (Loire-Atlantique), projet personnel sans but lucratif, gratuit, sans publicité, hébergé en France ; contact@ledicodesecoles.fr. Né dans « La boîte à dictées » (laboiteadictees.fr). Version bêta.

| Critère | Le Dico des écoles | PhonoActif |
|---|---|---|
| **Sens de travail** | **Son vers écrit** : l'élève écrit « élikoptèr », « foto », « chato » ; le dico montre toutes les graphies qui se prononcent ainsi, chacune avec une phrase et une image, et l'élève choisit selon le sens | **Écrit vers son** : l'élève pose des lettres, entend la lecture à chaque lettre (décodage et fusion) |
| **Public** | CP à 3e, usage libre en classe ou à la maison, par un simple lien, sans compte. Annoncé « particulièrement utile aux élèves dys » (affirmation du site, aucune référence citée) | Élèves en apprentissage tardif ou en remédiation, enseignants FWB, avec tableau de bord |
| **Aides** | Clavier des sons en images, couleur par sorte de mot, police Andika, mots rares cachés, mode « Complet » avec astuces sur les homophones (ces / ses / c'est / s'est) | Cartes préparées par l'enseignant, trois faces, habillages, lecture par syllabes ou entière |
| **Voix** | **Vraies voix** : 15 447 sons de **Lingua Libre**, 151 locuteurs, licence par locuteur affichée au survol (CC0, CC BY, CC BY-SA) | **Voix de synthèse** (Charline, fr-BE) : pseudo-mots, syllabes, états : ce que Lingua Libre ne peut pas faire |
| **Intelligence artificielle** | « Aucune IA ne répond à l'élève » : résultats issus d'un dictionnaire et de règles écrites à l'avance. En revanche une partie des définitions et des phrases a été rédigée ou simplifiée avec Claude, ChatGPT et Gemini, puis relue (déclaré) | Aucune IA sur le choix des mots (règle de JF). Mais la voix est synthétique : à dire clairement aux enseignants |
| **Sources** | Wiktionnaire (CC BY-SA), **Lexique 3.83 (indiqué CC BY-SA)**, Manulex, échelle Dubois-Buyse, liste MELS (Québec), pictogrammes ARASAAC (CC BY-NC-SA, « sans but commercial ») | ManuLemme, règles, Lexique 4.1 (licence à lever), RISS |
| **Suivi de l'élève** | Aucun : pas de compte, pas de cookie de suivi, recherches comptées anonymement et effacées au bout de 13 mois | Journal des essais, tableau de bord, relevé pour logopède (avec accord parental) |
| **Contexte** | France ; orthographes rectifiée et traditionnelle. Aucun mot belge mentionné | FWB, belgicismes, Pôle de Liège |
| **Fragilité constatée** | Page des enseignants : « souci de connexion en cours depuis fin octobre », la page peut tourner sans fin ; problème d'hébergeur | — |
| **Réutilisation** | « La reprise du contenu est possible dans le respect de ces licences ; pour toute autre utilisation, écrire à l'adresse de contact » | — |

### Ce que cela change pour nous
1. **Lingua Libre couvre au moins 15 447 mots d'école** (le Dico les a trouvés), avec 151 locuteurs. Les trois plus prolifiques (Lyokoï 2 502, DenisdeShawi 2 124, WikiLucas00 2 053 mots) sont **tous en CC BY-SA 4.0 seulement** : environ 43 % des sons du Dico. Si on exclut le BY-SA, la couverture chute ; il faudra choisir par fichier. Le pays des locuteurs n'est pas indiqué.
2. **Le Dico a déjà fait le chemin son vers écrit pour les mots réels**, avec phrases, images et voix humaines. Le refaire serait du doublon. Notre apport est ailleurs : le décodage lettre par lettre, la voix belge, les pseudo-mots, le suivi.
3. **Lien utile, pas concurrence** : après un essai dans PhonoActif, l'élève peut vérifier une orthographe dans le Dico. À ne faire qu'avec l'accord de l'auteur ou dans les termes des licences, et en tenant compte de leur souci d'hébergement.
4. **Une prise de contact est possible** (décision de JF) : partager le contexte FWB, demander si le Dico connaît des locuteurs belges, discuter d'un lien croisé.
5. **Précision sur Lexique 3.83** : le Dico déclare sous CC BY-SA la base Lexique 3.83 (source secondaire). Cela concorde avec ce que j'avais trouvé pour la 3.83 ; la licence de la 4.1 reste à lever.

## 3. Suites envisagées (décisions de JF le 2026-11-12, après lecture du site)

### Définitions : ce que le Dico propose réellement (constaté sur la fiche « oiseau »)
- **Deux niveaux existent** : une définition courte pour l'élève (« Animal qui a des plumes, deux ailes, deux pattes et un bec, et qui pond des œufs »), avec une phrase d'exemple ; et « Définitions plus complètes », tous les sens (6 pour oiseau), venant du Wiktionnaire (CC BY-SA). Boutons « Réduit » et « Complet ».
- **Les libellés P1-P3 et P4-P6 n'existent pas sur le site** : c'est une correspondance proposée par JF pour PhonoActif (qui a déjà deux habillages, P1-P3 et P4 et au-delà). Le site situe aussi chaque mot par sa fréquence, son rang parmi les 1 500 mots les plus fréquents, la fréquence Manulex, l'échelle MELS (Québec) et un taux de réussite à l'écrit (étude EQOL).
- **Pour une v2 de PhonoActif** (« sens » optionnel d'une carte) : trois voies, de la moins coûteuse à la plus coûteuse. (a) Lien vers la fiche du Dico : aucun contenu repris, aucune licence à gérer. (b) Texte écrit par l'enseignant dans la carte, éventuellement amorcé par une proposition qu'il corrige (zone éditable, règle 80/20). (c) Reprise de définitions : Wiktionnaire = adaptation sous CC BY-SA ; définitions du Dico = « reprise possible dans le respect de ces licences, autre utilisation : écrire à l'auteur ». Volume pour P1 : 941 mots x 2 niveaux = environ 1 900 textes à valider : non réaliste sans outil de saisie ou sans lien.
- **À décider** : source de vérité des définitions (enseignant, Wiktionnaire ou lien) ; sens belges (septante, dîner) absents du Wiktionnaire courant (non vérifié).

### Mention du Dico dans l'app
- **Où** : page enseignant (guide, limites, « pour aller plus loin »), pas dans l'écran de l'élève : l'élève quitterait l'app vers un site externe dont l'auteur signale un souci d'hébergement (page des enseignants du site).
- **Texte proposé (brouillon, chaque affirmation vient du site)** : « Pour vérifier une orthographe après un essai, vous pouvez utiliser Le dico des écoles (ledicodesecoles.fr), projet gratuit et sans publicité d'un enseignant. Il fait le chemin inverse de PhonoActif : l'élève écrit le mot comme il l'entend et le dico lui montre les orthographes possibles, avec une phrase pour choisir. Site indépendant, non lié à PLAI. »
- **Avant publication** : prévenir l'auteur (courtoisie, et il propose de lui écrire pour tout usage autre que la reprise de contenu) ; ne copier aucun contenu du Dico.

### Qui contacter
- **Lingua Libre (Wikimédia France)** : pas pour une autorisation, les licences sont libres et valables par fichier ; pour (1) savoir comment filtrer les locuteurs belges ou francophones de Belgique, (2) l'accès aux données en volume (le site répondait 503 le 2026-11-12), (3) **organiser une session d'enregistrement de nos listes (P1, VOB, belgicismes) par des voix belges, publiée en CC0 ou CC BY** : cela produirait un corpus libre de voix belges réutilisable sans contrainte et utile à d'autres. Non vérifié : comment Wikimedia Belgique peut aider, ce que demande une session. Si la voix est celle de JF ou de collègues, prévoir leur consentement écrit (donnée personnelle).
- **Auteur du Dico** : pour le lien croisé, la mention, et un éventuel partage d'expérience. Moins structurant.
