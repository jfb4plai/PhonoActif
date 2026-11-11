# Lilémo numérique (nom provisoire) : document de conception

Date : 2026-11-11. Statut : brouillon à valider par JF. Rien n'est codé.
Ce document complète `phonoactif/phonoactif-spec.md` (v0.2). En cas de contradiction, ce document fait foi pour : l'unité de l'app (le pack de cartes), l'absence d'IA sur le choix des mots, le tableau de bord, le lien avec le jeu physique.
Statuts : [constaté] vu dans un fichier ou une sortie ; [déduit] raisonné ; [non vérifié] à contrôler avant d'être écrit dans l'app.

## 1. Intention et pourquoi

Lilémo (écrit Lilémø par l'éditeur) est un jeu physique : une station en bois sur laquelle l'enfant pose des pavés-lettres, qui prononce le son détecté ; des cartes « mots » (recto : image + modèle à recopier ; verso : image seule) s'insèrent dans une fente (section 2 bis, d'après la notice). La version numérique reprend cette logique : le pack de cartes est préparé à l'avance sur l'ordinateur de JF (homogénéité Canva), l'app ne compose rien, elle affiche, fait entendre et enregistre.

Pourquoi un tableau de bord est essentiel : le public est composé d'élèves en apprentissage tardif ou en remédiation. L'enseignant doit voir vite quelles correspondances graphème-son sont déficitaires, quelles erreurs sont fréquentes dans le groupe, lesquelles reviennent chez un élève, et pouvoir transmettre ces observations à un intervenant extérieur (logopède, etc.).

## 2. Principe permanent : le lien avec la version physique

Demandé par JF le 2026-11-11 : lors de tout développement, étudier le lien avec la version physique, et le réaliser quand c'est possible.
Règle de travail : toute fonction décrite ou construite comporte une ligne « lien physique » qui dit (a) l'équivalent sur table, (b) ce que l'on gagne et perd entre les deux, (c) ce qu'il faut étudier. Si le lien n'est pas possible, la ligne le dit et explique pourquoi ; elle n'est jamais omise.
Le tableau de la section 9 applique cette règle aux fonctions prévues.

## 2 bis. Le jeu physique Lilémø, d'après la notice (reçue le 2026-11-11)

Sources : le mode d'emploi collé par JF (texte repris de pages web de l'éditeur et de vidéos, non revérifié par moi) et la notice PDF « NOTICE-EXTENSION-LILEMO » (Downloads), lue sur 2 pages [constaté]. L'éditeur est Lilylearn (Caen) ; la notice porte « Brevet déposé INPI n°1901178, Copyright 2019 @Lilylearn » [constaté sur le PDF].

Constaté :
- Mode sans carte : un pavé-lettre posé sur la station est détecté et le son est prononcé ; plusieurs pavés côte à côte, de gauche à droite, donnent syllabes et mots ; un bouton de relecture réécoute.
- Mode avec cartes : cartes par niveaux (Découverte maternelle, Intermédiaire, Challenge CP). Recto = image + modèle, l'enfant recopie avec les pavés ; verso = image seule, l'enfant compose le mot à l'oreille. Un bouton valide ; mélodie joyeuse (et cri de l'animal pour certaines cartes) si juste, autre son pour réessayer « sans pression ».
- Station : bouton blanc = réécouter la consigne, bouton jaune = valider, soulever et reposer une lettre = réécouter les lettres posées.
- Extension Lilémø+ (application smartphone, carte Activités par NFC) : plus de 90 activités ; après 3 essais sans réussite l'activité passe à la suivante ; résultats synchronisés avec l'appli en trois états « Acquis », « Presque acquis », « Non acquis » ; page Progression ; Historique des essais d'écriture « pour repérer les erreurs récurrentes » ; récompenses ; sons personnalisables avec sa propre voix ; quatre niveaux de parcours (Graine, Pousse, Herbe, Fleur de lecteur).
- La notice décrit le suivi pour « votre Lilykid » (un enfant, un parent). Je n'y ai pas vu de vue de classe ni de comparaison élève/groupe : [non constaté], pas [absent].

Conséquences pour la conception [déduit] :
- Le mode Cubes de la version numérique correspond à la station + pavés ; les deux faces d'une carte correspondent au « avec mot / sans mot » demandé par JF ; les 3 essais puis passage correspondent à l'aide graduée ; les trois états de la notice recoupent ✔ / ! / ✖ du tableau de bord (le libellé « Presque acquis » est à comparer à « À surveiller » : choix de JF).
- Ce que la version PLAI apporte et que la notice ne montre pas : vue de groupe, comparaison élève/groupe, relevé pour intervenant, ancrage FWB, voix belge, gratuité, logique de remédiation pour élèves plus âgés.
- Point juridique [non vérifié] : le nom Lilémø, la mécanique de la station et les cartes sont des objets de l'éditeur (brevet déposé, copyright). Je ne sais pas ce que couvre le brevet. Ne pas reprendre ses images, sons, textes ni son nom sans avis ; décision de nom en section 12. Cartes et sons de PLAI : créés par JF.
- Compatibilité avec une vraie station Lilémø (écrire sur ses cartes NFC) : [non vérifié], fermé a priori, hors périmètre.

## 3. Buts, non-buts, anti-buts

Buts
- Entraîner correspondances graphème-son, syllabes et mots avec des cartes préparées, en deux modes réglés par l'enseignant : mot visible ou non.
- Enregistrer chaque essai de façon utile à la remédiation, sans fabriquer de score global.
- Donner à l'enseignant une vue claire, élève par élève et groupe, avec signaux visuels forts.
- Produire un relevé d'observations transmissible à un intervenant, avec accord parental.
- Garder les cartes numériques et physiques issues du même pack.

Non-buts
- Pas d'IA pour choisir les mots, pseudo-mots, syllabes ou images (règle de JF).
- Pas de diagnostic : l'outil décrit ce que l'élève a fait dans l'outil.
- Pas de remplacement de la rééducation logopédique.
- Pas de nom d'élève dans l'outil.

Anti-buts (échec même si tout fonctionne)
- Un tableau de bord où l'enseignant ne voit pas en quelques secondes quoi traiter.
- Un enseignant qui fait moins confiance à son propre jugement après usage : le commentaire libre de l'enseignant est toujours présent et prioritaire dans le relevé.
- Un élève qui répond sans écouter parce qu'un indice de surface (couleur, forme) donne la réponse (voir règle du quiz sans indice de surface).
- Un son joué faux sans que personne ne l'ait validé à l'oreille.

## 4. Contraintes

- Références scientifiques : toute référence est vérifiée dans le RISS avant publication ; hors RISS, le dire. Références vues pendant la conception : section 11 (lues en extrait, aucune lue en entier).
- Aucune IA sur le choix des mots ; filtres déterministes sur ManuLemme autorisés, avec la raison affichée.
- Élèves identifiés par code anonyme ; RLS `auth.uid() = user_id` côté enseignant ; tables préfixées `phono_` ; `grant` Data API dans la même migration ; aucune migration appliquée sans accord de JF ; `grep` des conflits de noms avant tout `create table`.
- Accessibilité : texte au moins 16 px, jamais la couleur seule (symbole + mot), aucun chrono visible pour l'élève, tap en alternative au glisser-déposer, Arial pour les supports imprimés (Arial 12), consignes élèves à l'infinitif, une action par puce.
- Sons : un son n'entre dans l'app qu'après validation à l'oreille de JF. 18 sons validés [constaté, spec v0.2].
- Branding PLAI (teal #0f6e56, orange #f97316, DM Sans/DM Serif Display, logo à hauteur fixe) ; vérification visuelle de la nav, du conteneur et du pied de page avant la fin.
- Déploiement : branche `main`, `npx vite build` sans erreur avant tout `git push`, rien poussé ni déployé sans accord de JF.
- Champs de formulaire : label précis, placeholder concret, aide expliquant l'impact de la saisie.
- Exemples FWB uniquement.

## 5. Décisions déjà prises par JF (telles qu'il les a prises)

- Forme : React + Supabase (décision du 2026-11-10).
- L'unité de l'app est le pack de cartes préparées sur l'ordinateur de JF ; trois faces possibles par mot (image seule, image + mot, mot seul) ; l'enseignant règle avec ou sans mot.
- Des packs avec images plus réalistes pour des élèves plus âgés allophones sont possibles.
- Options à développer : étude par syllabes ; mémo son/syllabes, son/lettres, son/mots (images + mots, images, ou mots).
- Tableau de bord enseignant : résultats des élèves et du groupe qui reçoit la même tâche par QR ou lien ; contenu : liaisons graphème-phonème déficitaires, erreurs fréquentes du groupe, erreurs récurrentes, toute information utile à la remédiation ou à partager avec un intervenant extérieur.
- Signaux visuels forts (jauges colorées retenues, style B), distinction nette entre élève seul et groupe, grille élèves × sons comme écran d'accueil (maquette v4 retenue ; maquettes dans `phonoactif/.superpowers/brainstorm/1863-1794385199/content/`).
- Aucune IA pour le choix des mots.
- Ordre des chantiers accepté : socle + un premier jeu, puis tableau de bord, puis autres jeux, puis extensions.
- Habillage (JF, 2026-11-11) : deux styles CSS, un « livre d'enfants » pour P1 à P3 et un style plus mature pour les plus âgés (P4 et au-delà, adolescents et adultes allophones). Contraintes à tenir [mes ajouts, non décidés par JF] : le mot à lire reste en Arial, lisible et sans fioriture (règle dyslexie de JF) ; l'habillage passe par les couleurs, les cadres, les illustrations et le fond, pas par la police des mots ; aucune animation parasite ; mêmes jeux de variables CSS pour les deux styles, choisis par l'enseignant par tâche ou par pack ; lien avec la version physique à étudier : les cartes de 63 x 88 mm ont le même habillage (cadre, couleurs) que l'écran. Maquettes faites le 2026-11-11 : JF a retenu A1 « Cahier colorié » (fond quadrillé, traits épais, ombres franches, bouton jaune) pour P1 à P3 et M1 « Sobre clair » (filets fins, angles peu arrondis, photos réalistes) pour P4 et au-delà ; A2 « Forêt douce » et M2 « Ardoise » non retenus (fond sombre à reconsidérer plus tard comme option, certains lecteurs dyslexiques préférant un fond clair). Variables CSS de départ dans `docs/design/habillages-a1-m1.css` (`data-habillage="album"` et `data-habillage="sobre"`), provisoires, non testées avec des élèves. Reste à décider : qui choisit l'habillage (par tâche, par pack ou par groupe) et ce que fait un groupe mixte ; les gabarits Canva des cartes 63 x 88 mm aux couleurs de A1 et M1.
- HubActif mis en réserve (JF, 2026-11-11) : l'assignation par lien ou QR et le tableau de bord de groupe restent essentiels, mais leur mécanisme n'est plus fixé sur HubActif ; à redéfinir avant le plan du tableau de bord [non décidé].
- Toute déviation phonétique doit pouvoir être vérifiée et corrigée, et les entrées à plusieurs mots doivent être validées (JF, 2026-11-11) : voir « Corrections et validation » en section 7.

## 6. Le pack de cartes

- Un pack est un dossier préparé hors de l'app : une image par carte (PNG), une variante avec mot imprimé et une variante sans mot, plus un fichier de liste. Chaque variante vient du même gabarit Canva. [déduit : deux fichiers par carte, car le mot imprimé fait partie de l'image.]
- Fichier de liste : un mot par ligne avec niveau, graphèmes (issus de ManuLemme, signalés « à vérifier » si absents), nom des deux fichiers image, identifiant de carte stable, source et licence de l'image.
- Le mot imprimé dans l'image est un pixel : texte alternatif obligatoire (le mot) ; police Arial dans Canva.
- Format de carte : 63 x 88 mm (format poker) [rapporté par JF le 2026-11-11 d'après une page de l'éditeur, non revérifié par moi]. À 300 dpi cela fait environ 744 x 1039 px sans marge, et environ 815 x 1110 px avec 3 mm de fond perdu [calcul, à confirmer avec l'imprimeur]. Gabarit Canva à ce format : cartes imprimables à la même taille que les vraies, pochettes du commerce utilisables. L'éditeur vend aussi des « cartes vierges » (adresse citée par JF) : usage possible avec une station, non vérifié.
- Les modes « avec mot » et « sans mot » choisissent la variante de fichier. Un mode « mot qui s'efface » (le mot reste quelques secondes puis disparaît) demande le mot en texte, pas en image : à étudier (section 12).
- Packs prévus : P1 FWB (941 mots de la liste de P1, 729 noms candidats à l'image [constaté, spec v0.2]), puis packs thématiques, puis pack allophone à photos réalistes. Licences des images : ARASAAC est CC BY-NC-SA, compatibilité avec PolyForm NC non vérifiée ; les autres banques non vérifiées ; les images propres de JF ou de l'enseignant n'ont pas ce problème.
- Association mot-image : jamais automatique ; table validée par un humain.

## 7. Le cœur, les sons, les mots

- Cœur de Lilémo (version phonémique.html, test-lilemo.js) : à corriger pour ien, e des monosyllabes (se), geai, yod /j/, sept ; générer la colonne des graphèmes depuis ManuLemme et réserver l'heuristique aux mots absents [spec v0.2].
- Sons : 18 validés à l'oreille ; p et t provisoires très courts ; plusieurs jugés mauvais ; phonème isolé par synthèse IPA non prouvé. Les sons de syllabes ne sont pas prêts.
- Choix des mots par l'enseignant : liste libre, ou filtres sur ManuLemme (phonème, graphème, nombre de syllabes, fréquence P1, classe) ; la raison s'affiche pour chaque mot proposé ; les mots refusés (graphèmes hors niveau) sont signalés, pas modifiés.

### Corrections et validation (exigence de JF, 2026-11-11)

ManuLemme est la source de départ, jamais l'autorité finale. Le moteur codé le 2026-11-11 signale déjà ce qui est incertain ; il manque la couche qui permet de le vérifier et de le corriger. À construire (plan à écrire) :
- Un dictionnaire de corrections, propre à PLAI, qui l'emporte sur ManuLemme : par mot, graphèmes et sons corrigés, statut (« à valider », « validé », « corrigé »), auteur, date, raison. Ordre de priorité : correction > graphèmes explicites de la carte > ManuLemme > heuristique.
- Un écran de revue : liste des mots signalés (au 2026-11-11 : 874 entrées de ManuLemme à code non traité, dont « 8 » seul, soleil, voyage, loin, ville ; plus les mots absents ; plus les entrées à plusieurs mots), avec écoute du résultat, correction, validation. Une correction se retrouve dans l'app et dans les packs sans retoucher ManuLemme.
- Les entrées à plusieurs mots (« pomme de terre », « aujourd'hui », absent de ManuLemme) ne sont jamais acceptées automatiquement : statut « à valider » tant que JF ou l'enseignant ne les a pas vues.
- Un mot « validé » à l'oreille reste validé quand le lexique est régénéré.
- Le schwa prononcé (le, se, de, je, ce, ne, que) : ManuLemme dit quand il se prononce (code %), mais ne fournit aucun son ; un fichier son est donc nécessaire. L'id actuel `e_muet` prête à confusion (la lettre muette n'a pas de fichier) : renommer en `schwa` ou réutiliser `eu_ferme` si l'oreille de JF l'accepte [non décidé].

### Liste de vocabulaire P1 fin de période 1 (fichier de JF, lu le 2026-11-11)

Fichier : `apprendre à lire\app pour créer texte à partir phonèmes déterminés\liste vocabulaire à utiliser pour histoire P1 fin période 1 - Copie.xlsx`. Constaté : 3001 lignes, 2807 mots distincts (certains en double selon la classe grammaticale), phonologie ManuLex par mot, un drapeau 0/1 « connu » par phonème, une part de phonèmes connus de 0 à 1 par mot ; la feuille 2 déclare 11 phonèmes connus (R, a, #, i, t, o, l, e, s, m, p).
- 363 mots ont une part de 1 dans le fichier. En comparant les phonèmes exactement (majuscule et minuscule distinctes), seuls 186 restent à 1 : 177 mots (par exemple chat, mais, elle, porte, pomme, chapeau) sont comptés 100 % alors qu'ils contiennent /ʃ/, /ɛ/ ou /ɔ/, notés « non » à la feuille 2. Cause probable : recherche insensible à la casse dans les formules (S pris pour s, E pour e, O pour o) [déduit, formules non lues]. Feuil2 contient aussi des doublons contradictoires (e « oui » et e « non »). Fichier non modifié.
- L'unité du fichier est le phonème. Celle de l'app est la liaison graphème-phonème (ch vers /ʃ/, ay vers /e/), plus fine : ManuLemme fournit la segmentation correspondante.
- Le filtre « mots dont toutes les correspondances sont connues » est exactement le filtre déterministe voulu (aucune IA). À réutiliser au niveau graphème, avec la raison affichée.
- Listes de mots par année : [non trouvé dans le RISS] de liste officielle FWB (absence de résultat, pas preuve d'absence). Manulex (Lété, Sprenger-Charolles et Colé, 2004) donne fréquence et dispersion par niveau CP, CE1, CE2-CM2 sur 54 manuels français [hal-01001916, dumas-01357072, hal-03194331, extraits] : mots rencontrés en manuels de France, pas mots à connaître en FWB.
- Listes officielles FWB trouvées (2026-11-11, texte extrait des PDF) : « Référentiel de français et langues anciennes, tronc commun » (ifpc-fwb.be/v5/documents/tc/refFRALA.pdf, 237 pages, PDF créé en juin 2022) contient « P1 liste des mots à haute fréquence » (page 41 du document) et « P2 liste des mots à haute fréquence » (page 57), source citée : Giasson 2003. Les deux listes comptent environ 92 à 93 formes et ne diffèrent que par « ou » (présent en P1 seulement) ; attendu : initiation à 50 % des mots en P1, maîtrise en fin de P2. Aucune liste P3 à P6 trouvée par recherche de texte dans ce document. « Référentiel des compétences initiales » (refRCI.pdf, 112 pages) : aucune liste de mots trouvée. Ces PDF datent de 2022 : ce n'est pas l'« ancien référentiel » (Socles de compétences) dont JF parle ; ce dernier n'a pas été consulté. Droits de réutilisation non vérifiés.
- Liste « Vocabulaire orthographique de base » reçue de JF le 2026-11-11 (`C:\Users\jfbeg\Downloads\VOB\`, tableur + version Word « adaptée, ressource 2018 ») : le tableur donne pour chaque mot une nature et une « année suggérée d'apprentissage et d'évaluation » de P1 à P6 [constaté]. 3457 lignes, 3417 mots distincts : P1 52, P2 168, P3 797, P4 977, P5 895, P6 568. Provenance et droits : le fichier ne les indique pas [non vérifié]. Croisement avec ManuLemme par le moteur : 2933 lignes trouvées sur 3457 ; 523 mots distincts absents, dont 134 à plusieurs mots (à côté, arc-en-ciel, à peu près) et 389 mots simples, parmi lesquels 224 ont une base dans ManuLemme (formes féminines et accordées : actrice, active, allemande) ; 693 lignes à vérifier au total. Ces mots absents et multi-mots entrent dans la file de revue ; une règle de dérivation (féminin, pluriel) pourrait en proposer le son [piste, non faite]. La version Word est une mise en page à colonnes (article + mot) dont le texte extrait ne contient pas les années.
- Prudence sur les textes entièrement déchiffrables : le rapport d'expertise ALOE écrit qu'il n'est pas démontré qu'ils permettent un meilleur apprentissage [hal-03118037, extrait] ; Goigoux 2016 mesure le « rendement effectif » (part de graphèmes déchiffrables) des textes de CP [hal-01683286, extrait]. Cela concerne un projet de génération de textes, pas le pack de cartes.

## 8. Enregistrement des essais, tableau de bord, relevé

Enregistrement (par essai) : code élève, tâche, carte, liaison graphème-son visée, réponse donnée, son avec lequel elle est confondue, aide utilisée (réécoute, bouche, révélation, aucune), date, séance. La durée par essai n'est pas affichée à l'élève ; son enregistrement est [non décidé, voir section 12]. Les données détaillées restent dans les tables `phono_` ; le hub ne reçoit que des indicateurs à libellés déclarés (par exemple « cartes réussies », « cartes reprises ») et la fin de tâche, parce qu'il n'accepte ni texte libre ni score global [mémoire HubActif, 2026-09-20, non revérifiée dans le code].

Écrans du tableau de bord (maquettes retenues) :
- Grille du groupe : une ligne par élève (code), une colonne par son, case colorée avec symbole (✖ à reprendre, ! à surveiller, ✔ acquis, gris pas assez d'essais), dernière ligne = nombre d'élèves en difficulté par son.
- Sélection : cocher des lignes ; cliquer un code ouvre la fiche seule ; cliquer le chiffre d'un son coche d'un coup les élèves concernés ; une sélection peut être nommée et enregistrée.
- Trois vues et trois identités : groupe (bleu, « TOUT LE GROUPE »), sélection de 2 à 5 élèves (magenta, jauges côte à côte et ligne « ce qu'ils ont en commun »), sélection large (une jauge par son), élève seul (violet). Rouge, orange et vert servent uniquement à l'urgence.
- Fiche élève : bandeau « À traiter en priorité », jauges avec repère du groupe, étiquette « Individuelle » ou « Partagée », aides utilisées, mots qui reviennent, zone de commentaire de l'enseignant.
- Seuils de départ [mes choix, jamais validés, à régler par l'enseignant] : rouge sous 60 % de réussite, orange de 60 à 80 %, vert au-dessus, gris sous 5 essais ; « récurrent » à partir de 3 séances ; « partagée » si le groupe est sous 60 % ; « individuelle » si le groupe est à 70 % ou plus et l'élève sous 60 %. Aucune source RISS ne les fonde.
- Relevé pour un intervenant : PDF d'observations de jeu, jamais un diagnostic, avec choix du contenu, case « accord écrit des parents », aucune transmission automatique ; l'enseignant télécharge et transmet.

Assignation : la tâche (pack + mode + paramètres) est assignée au groupe par lien court ou QR via HubActif (code élève sans compte, jeton signé) selon le modèle LexiActif [mémoire, non revérifié]. La décision d'unicité des codes élèves de HubActif reste ouverte.

## 9. Lien avec la version physique, fonction par fonction

| Fonction numérique | Équivalent sur table | Gain / perte | À étudier |
|---|---|---|---|
| Pack de cartes (variantes avec/sans mot) | Les mêmes cartes imprimées, recto avec ou sans mot | Une seule source Canva ; perte de couleur et de coupe selon l'imprimante | Export Canva en PDF d'impression, 300 dpi, marges de coupe, taille de carte réelle de Lilémo |
| Export du pack en PDF à découper | Le jeu physique lui-même | Les élèves peuvent jouer sans écran | Format de page, nombre de cartes par feuille, identifiant du pack imprimé au dos |
| QR ou étiquette NFC sur une carte (suggestion de JF pour NFC) | Carte physique qui joue son son et s'ouvre sur tablette ou téléphone | Son correct sans voix de l'enseignant ; la carte physique devient la télécommande du numérique | Modèle déjà conçu dans l'app perso garde-manger : l'étiquette ne contient que l'URL d'un identifiant de carte, jamais de donnée d'élève [mémoire, non testé sur appareils]. Décision de JF (2026-11-11) : les cartes physiques sont faites par JF ou par l'enseignant ; QR ou NFC est leur choix, l'app ne s'en occupe pas et n'a pas à connaître les appareils des élèves. Elle expose seulement une adresse stable par carte. Reste à vérifier : comportement sans réseau, longueur du code. Compatibilité avec une vraie station Lilémø : voir section 2 bis, [non vérifié] |
| Mémo à paires libres | Memory avec les mêmes cartes | Le numérique enregistre les essais ; le physique, non | Saisie manuelle rapide de l'observation d'un jeu sur table dans le tableau de bord |
| Étude par syllabes | Cartes syllabes à découper, mot découpé | Découpage guidé numérique ; manipulation physique | Même segmentation ManuLemme sur les deux supports |
| Pyramide d'aide (retrait progressif de l'image, du mot, du son) | Carte avec mot, carte sans mot, carte retournée | Retrait progressif automatique ; physique : à la main | Retrait par paliers réglés par l'enseignant sur chaque support |
| Grille du tableau de bord | Fiche de suivi imprimée | Lecture rapide ; impression noir et blanc possible grâce aux symboles | Gabarit A4 de la grille imprimable |
| Relevé pour intervenant | Fiche papier remise au logopède | Même contenu, deux supports | Mentions légales et accord parental sur le document |
| Loto sonore (extension) | Planches de loto | Son numérique, planche physique | Planche imprimable avec les mêmes cartes |

## 10. Ordre de réalisation et ce qui reste au constructeur

1. Socle : import d'un pack, affichage des cartes avec/sans mot, mémo à paires libres, enregistrement des essais, assignation par HubActif, export PDF des cartes.
2. Tableau de bord : grille, fiche élève, sélection, relevé PDF.
3. Autres jeux : étude par syllabes, pyramide d'aide, mot qui s'efface ; sons de syllabes validés à l'oreille d'abord.
4. Extensions : loto sonore, QR au dos des cartes, pack allophone, révision espacée.

Laissé au constructeur : structure de projet React/Vite/Tailwind, stockage des packs et des images (Supabase Storage ou fichiers statiques, limites du projet partagé non vérifiées), schéma exact des tables `phono_` avec RLS, mécanisme d'import d'un pack, format du fichier de liste, bibliothèque de génération de PDF, méthode de tests (hors navigateur pour le cœur, parcours réel sur tablette pour les écrans).

## 11. Références RISS vues pendant la conception (extraits seulement)

Aucune n'est lue en entier. Mémoires et thèses (`dumas-`, `tel-`) non revus par les pairs. Aucune ne démontre qu'un jeu, une carte ou un tableau de bord améliore la lecture.
- hal-01623137 Bosse & Zagar 2016 : rôle de la syllabe dans l'apprentissage de la lecture à étudier (donc non établi).
- hal-03870273 Bodinier 2021 (mémoire) : approche syllabique et/ou graphophonémique dans la remédiation orthophonique.
- tel-00979303 Pérez 2013 (thèse) : dictée et copie de mots dans l'apprentissage de l'orthographe.
- hal-01555567 Pérez & Giraudo 2016 : copie, lecture et dictée de pseudo-mots (l'extrait signale la supériorité de la copie sur la lecture pour des pseudo-mots orthographiquement complexes).
- dumas-03932644 Dauphin 2022 (mémoire) : oral et visuel pour le vocabulaire d'élèves allophones, petit échantillon.
- dumas-01756950 Rivière 2017 et dumas-03351379 Benoit 2021 (mémoires) : répétition espacée.
- hal-04617908 Florin, Tricot et al. 2023 et hal-04621117 Soubre et al. 2023 : évaluation formative au service de l'apprentissage.
- dumas-01502860 Geoffroy 2014 (mémoire) : prise en charge tardive des troubles du langage écrit (périphérique).
- Déjà listées dans la spec v0.2 : section « Références RISS déjà vues ».
Recherches sans résultat pertinent : lecteurs tardifs ou adolescents non-lecteurs ; ne rien affirmer à ce sujet dans l'app sans source.

## 11 bis. Gestion des données (questions à JF, 2026-11-11, une à la fois, aucune hypothèse sans son accord)

Constaté : les essais restent aujourd'hui sur l'appareil de l'élève (stockage du navigateur), exportables en fichier ; aucune table Supabase n'existe pour cette app ; les tables `phono_*` de la spec v0.2 sont une hypothèse non décidée.
Réponses de JF :
1. Qui voit les résultats d'un élève : l'enseignant ou les enseignants concernés, avec la possibilité de partager le tableau de bord de l'élève avec une logopède par exemple. Comment ce partage se fait (compte, lien temporaire, fichier) : non décidé.
2. Arrivée des résultats : envoi en fin de séance en v1 (pas de suivi en direct). L'envoi peut être déclenché par l'enseignant et/ou par l'élève.
3. Rattachement des résultats à une classe et à un enseignant : par le lien ou le QR code que l'élève a utilisé. Ce que devient un lien de carte seule (QR au dos d'une carte physique) : non décidé.
4. Compte enseignant : obligatoire (connexion personnelle) pour créer les liens et lire les résultats.
5. Le compte enseignant est le même que dans les autres apps PLAI (projet Supabase partagé, table `profiles` existante).
6. Partage avec une logopède : par un code envoyé par l'enseignant, à usage unique, temporaire (jeton). Accès de 30 jours après l'usage du code ; l'enseignant peut renvoyer un autre code plus tard. Lecture seule en v1 (pas d'écriture par la logopède). Un code non utilisé expire après 30 jours.
7. Conservation des résultats des élèves sur le serveur : purge annuelle. L'enseignant dispose d'une option à cocher, élève par élève, pour garder l'historique au-delà de la purge. Date de la purge : non précisée.
8. Hors connexion : les résultats restent sur l'appareil et partent à la prochaine connexion.
9. Packs de cartes : l'enseignant choisit dans un catalogue (images homogènes, créées avec génération d'images) ; tout enseignant peut envoyer une demande de création de pack ou de cartes. Les demandes sont traitées par JF et par un autre administrateur le cas échéant. L'enseignant voit l'état de sa demande (souhaité par JF : « c'est mieux » ; les états exacts restent à définir). Le catalogue est visible par tous les enseignants connectés.
10. Corrections phonétiques : un enseignant peut en proposer. Une proposition ne devient effective qu'après validation par un administrateur : seuls les administrateurs modifient.
11. Stockage des packs : Supabase (stockage de fichiers) pour les versions d'écran, afin qu'un administrateur ajoute un pack sans redéployer ; export d'un pack en archive ZIP (manifeste, images, sons, source et licence) pour le diffuser à qui le demande ; SharePoint pour cette diffusion et pour les fichiers maîtres d'impression, pas comme source de l'app (accord de JF). Limite de taille du stockage du projet partagé et poids des images d'écran : à vérifier.
12. Codes des élèves : l'enseignant les crée et garde la correspondance avec les élèves ; ces codes peuvent servir dans beaucoup d'autres apps ; liaison avec HubActif en v2. L'unicité d'un code est celle de sa classe : la classe est liée au code, deux élèves d'une même classe ne peuvent pas avoir le même code, deux classes (donc deux enseignants) peuvent avoir le même code. Quand plusieurs enseignants sont sur la même classe (cas rare), ils partagent les mêmes données. Le point ouvert de HubActif (unicité globale des codes, mémoire du 2026-09-20) devra s'aligner sur cette règle en v2.
13. Un second enseignant est invité sur une classe par l'enseignant « master » de cette classe. Ce que le master peut faire en plus de l'invité : inviter (JF : « inviter »). L'invité ne peut pas supprimer d'élève ni la classe : seul le master le peut (JF : « non »).
14. Côté serveur, le détail de chaque essai est conservé si possible (positions, graphème posé, juste ou faux), pas seulement des totaux (JF : « si possible, détail essai »).
15. Les administrateurs sont désignés à la main par JF.
16. Avant de générer un code pour une logopède, l'app demande à l'enseignant de confirmer par une case à cocher qu'il a l'accord des parents. Cette confirmation est conservée, avec l'enseignant, la date et l'élève concerné.
17. Chaque projet Supabase de JF héberge plusieurs apps (pas de projet dédié par app). Quel projet pour PhonoActif : à confirmer.
18. JF tient le rôle de DPO au sein du Pôle : les décisions de protection des données sont les siennes (pas d'avis externe à demander) ; elles doivent être documentées (registre de traitement : finalité, base légale, durées, destinataires, sous-traitants Supabase, Vercel et GitHub, lieu d'hébergement, droits des personnes).
19. Région d'hébergement du projet Supabase partagé : Europe (déclaré par JF, non vérifié par Claude dans le tableau de bord ; région exacte à noter au registre).
À traiter : registre de traitement ; lien avec GitHub et Vercel ; ce qui est personnel dans les données.

## 12. Questions ouvertes

Pour JF (réponse nécessaire) :
1. Usage réel : avez-vous des stations Lilémø en classe, comment les élèves s'en servent-ils aujourd'hui, et la version PLAI doit-elle les accompagner (mêmes progressions) ou exister seule sur tablette ? Les règles du jeu sont connues par la notice (section 2 bis) ; le format de carte est connu (63 x 88 mm, section 6) ; le nombre de cartes par pack reste à fixer.
2. Nom : DÉCIDÉ par JF le 2026-11-11 : « PhonoActif » (dépôt GitHub jfb4plai/PhonoActif, branche main, sous-domaine phonoactif.jfb4plai.com selon les conventions PLAI). « Lilémo numérique » n'est pas utilisé (brevet déposé et copyright 2019 mentionnés sur la notice de l'éditeur ; portée non vérifiée).
3. Licence de la voix de bibliothèque pour une diffusion aux écoles : à contrôler avant diffusion.
4. Décision de JF, DPO du Pôle, sur le suivi par élève sous code anonyme, consignée dans un registre de traitement, avant tout usage avec de vrais élèves.
5. Seuils de couleur et de « récurrent » : valeurs de départ à valider avec une logopède ou en classe.

Décisions prises par défaut (à confirmer ou corriger) :
- Premier jeu du socle : mémo à paires libres.
- Accès élève par code via HubActif, sans compte élève.
- Durée de réponse : non enregistrée dans la première version.
- Fichier de liste du pack : tableur, comme Lilémo aujourd'hui.

À étudier avant de décider : mode « mot qui s'efface » (nécessite le mot en texte) ; saisie manuelle des observations du jeu sur table ; limites de stockage Supabase pour les images ; licence ARASAAC face à PolyForm NC ; comportement des QR hors ligne.
