# PhonoActif (nom provisoire) — spécification v0.1 (brouillon)

Statut : brouillon de conception, rien codé. Tout ce qui est marqué [non vérifié] doit l'être avant d'être écrit dans l'app.

## Hypothèses (non données par JF)
- Public : élèves P1-P2 FWB, dont dyslexiques ; l'enseignant ou la logopède configure.
- Nom : "PhonoActif" suit la nomenclature -Actif ; sous-domaine phonoactif.jfb4plai.com ; repo jfb4plai/PhonoActif, branche main.
- Origine : alternative PLAI à une app tierce (phonofusion.com) analysée sur une capture, non testée.
- Stack : React 18 + Vite 5 + Tailwind 3 + Supabase (projet partagé) ; IA seulement pour aider l'enseignant (Haiku 5.5), jamais côté élève.

## Objectif pédagogique
Entraîner la fusion de sons (lettres → phonèmes → syllabe/mot/pseudo-mot) avec un modèle oral belge fiable et le geste de bouche associé, avec retour immédiat et sans pression.

## Questions challengeantes — réponses de départ
- Élève en difficulté : l'audio correct (pas "pé") et les indices voisement / nasal / souffle servent d'abord à l'élève. Bénéfice enseignant : liste de mots et suivi.
- Ce que l'app ne fait pas bien : ne remplace pas la rééducation logopédique ; la bouche seule ne distingue pas p/b/m [hal-01841447] ; le français de Belgique n'est pas uniforme.
- Singularité enseignant : liste de mots et pseudo-mots, consignes à l'infinitif, ordre des phonèmes, emploi des gestes Borel-Maisonny ou non, voix choisie parmi celles validées.

## Parcours élève (4 écrans, un geste par écran)
1. Écoute : le graphème s'affiche, le son (phonème, pas le nom de la lettre) se joue. Bouton "bouche" : vidéo ou image de l'articulation.
2. Fusion : 2 à 3 graphèmes ; l'élève touche chaque graphème dans l'ordre (tap ; glisser-déposer en option), le son fusionné se joue.
3. Choix : trois images ou trois mots ; un seul distracteur proche (ex. /p/ vs /b/) puis deux.
4. Retour : bonne réponse = son rejoué ; erreur = aide graduée (réécouter, montrer la bouche, puis seulement révéler). Aucun chrono, aucun score public.

Niveaux : (1) voyelles + consonnes continues (a, i, o, u, é, l, m, n, r, s, f…) ; (2) occlusives en syllabes CV ; (3) graphèmes complexes (ou, on, an, ch, qu, eau) ; (4) pseudo-mots. Ordre à valider par une logopède ; appui RISS : correspondances régulières fréquentes d'abord, explicite et systématique [hal-04561796], [hal-02334227].

## Moteur écrit → son (point critique)
Principe : l'audio est choisi par identifiant de phonème, jamais en envoyant le texte à une synthèse vocale.
- Segmentation en graphèmes par règles contextuelles (liste fermée par niveau).
- Table `grapheme → phonème (IPA + id audio)` ; é = /e/, è et ê = /ɛ/, e seul = schwa, c/g/s selon contexte.
- Audio : voix belge réelle. Syllabes CV et VC enregistrées, puis découpées ; occlusives au relâchement minimal, validées par logopède. Raison : la perception d'une consonne dépend de la voyelle voisine [hal-01887328].
- Pseudo-mots : concaténation de syllabes enregistrées, jamais de TTS qui devine la prononciation.
- Nom de la lettre : bouton séparé, étiqueté, désactivable (Hillairet de Boisferon, Colé & Gentaz 2010 : réel, hors corpus RISS ; cité dans [tel-00979303]).
- Tests automatiques : (a) aucun fichier audio nommé d'après le nom de la lettre ; (b) é, è, e ont trois audios distincts ; (c) chaque graphème du niveau a un audio ; (d) tout pseudo-mot du niveau se segmente sans reste.

## Bouche (assets)
Statut des sources : voir section "Sources belges" ci-dessous. Décision de départ :
- Option A (recommandée) : courtes vidéos d'une locutrice ou d'un locuteur de Liège, visage de face et de profil, une par phonème, avec accord écrit (RGPD, droit à l'image) ; validation par logopède de Liège.
- Option B : dessins stylisés d'un seul style ; seule l'articulation varie (pas de couleur, de dents ou de décor qui servent d'indice) ; ajouter pictos voisement (main à la gorge), nasal (main au nez), souffle.
- Option C (plus tard) : avatar audiovisuel [hal-04317304], [hal-04314092] ; coût élevé.
- Bouche désactivable : l'intégration audiovisuelle varie d'un individu à l'autre [tel-05293941].
- Ne pas réutiliser les images IRM de la recherche sans licence explicite.

## Modèle de données (préfixe obligatoire `phono_`)
Vérifier les conflits avant tout `create table` : `grep -rIn "create table" --include=*.sql --exclude-dir=node_modules .` (un premier grep sur "phono_" n'a rien donné ; non rerun après décision finale).
- `phono_phonemes` (id, ipa, audio_url, mouth_url, traits : voisement, nasal, mode, lieu)
- `phono_graphemes` (id, texte, phoneme_id, contexte, niveau)
- `phono_lists` (id, user_id, nom, items jsonb) — listes de l'enseignant
- `phono_sessions` (id, user_id, code_eleve anonyme, date, résultats par phonème)
RLS `auth.uid() = user_id` partout. `grant` Data API dans la même migration. Table `profiles` réutilisée, pas recréée. Aucune migration appliquée sans accord de JF.

## IA (split 80/20)
- Haiku 5.5 propose des mots et pseudo-mots d'un niveau donné dans une zone éditable ; l'enseignant corrige et ajoute ses mots. Sortie JSON stricte via `output_config.format`.
- Après génération, un contrôle code vérifie que chaque mot se segmente avec les graphèmes du niveau. Aucun usage IA côté élève, aucune décision automatique sur l'élève.

## Guidage des champs (exemple)
Champ "Mes mots" : label "Mots à entraîner", placeholder "chat, riz, lune", aide "Seuls les graphèmes du niveau choisi sont acceptés ; un mot refusé est signalé, pas modifié."

## Voyelles nasales (ajout 2026-11-10, d'après capture de PhonoFusion)
Constaté sur la capture : l'écran affiche « au » (voyelle orale /o/), pas une nasale. Une des trois images est un nez au-dessus d'une bouche : la nasalité y est symbolisée par un pictogramme, pas par un mouvement visible.
- La lecture labiale ne distingue pas la nasalité [hal-02798539, citant Borel 2015 ; tel-01162201]. Le nez est donc une convention à apprendre, jamais une observation de la bouche.
- La nasale n'est pas qu'une orale + nez : elle ajoute des gestes oraux (arrondissement, protrusion des lèvres pour les postérieures) [tel-01162201], [W2937847772].
- Les nasales sont plus longues que les orales (0,135 s contre 0,097 s chez des enfants de 5-12 ans) [hal-02798539] : ne pas raccourcir les enregistrements nasals au découpage.
- Erreur fréquente même chez des enfants entendants : /ã/ confondu avec /õ/ (10 % dans l'étude) ; /u/ et /o/ proches par l'arrondissement des lèvres, la dimension la plus visible [hal-02798539].
Règles :
- Niveau dédié après les voyelles orales ; paires minimales oral/nasal (a/an, o/on) : même bouche, avec ou sans nez, une seule différence par paire.
- Image nasale = bouche de la voyelle orale proche + pictogramme nez + son ; jamais un nez avec une bouche de forme différente.
- Enregistrements : voyelles nasales sans appendice consonantique (« n » ajouté), comme en français septentrional [tel-02467926] ; accord à valider pour le français de Belgique (non vérifié).
- Nombre de nasales : /ã/, /õ/, /ɛ̃/ dans [hal-02798539] ; /œ̃/ (« un ») : sa présence en français de Belgique n'est pas vérifiée par moi, décision à confirmer avec Delvaux ou une logopède.
- Capture « in » de PhonoFusion (constaté) : trois images, nez + bouche peu ouverte, bouche très ouverte avec langue visible, sourire large sans nez. Un seul nez parmi les trois : l'élève peut répondre « nez = nasale » sans discriminer entre nasales. Règle PhonoActif : prévoir des items à deux ou trois nasales (in / an / on), nez sur chaque image, seule la bouche change.
- Distracteurs utiles : l'étude [hal-02798539] range /a/ comme correspondant phonétique de /ɛ̃/ (paire « tintin / tata ») et /ɛ/ comme correspondant phonologique ; garder ces deux voisins comme distracteurs, c'est un bon choix à reprendre.
- Style des images : même cadrage, même taille, même niveau de détail (langue visible, dents) sur toutes les images d'un item, sinon la saillance visuelle sert d'indice.
- Test audio obligatoire avant diffusion : jouer « in », « an », « on », « é », « è », « p » et noter ce qu'on entend ; une capture d'écran ne le prouve pas.
- Mesures sur deux enregistrements d'écran de PhonoFusion (2026-11-10) : « c » = bruit sourd d'environ 0,1 s, sans voyelle, compatible /k/ et non « cé » ; « oi » = son voisé d'environ 0,27 s, compatible /wa/. Confirmé à l'oreille par JF (2026-11-10) : « c » = /k/, « oi » = /wa/ ; reste non testé : /s/ pour « ce », « ci », é, è, e, in, an, on, p.
- Mesures sur quatre autres enregistrements (2026-11-10, voix à F0 d'environ 165 Hz dans tous) ; confirmés à l'oreille par JF (2026-11-10) : « ei » 0,19 s, voyelle unique proche de /ɛ/ (F1 de 720 à 550 Hz, F2 vers 2,5 kHz) ; « en » 0,21 s, voyelle ouverte (F1 vers 850 Hz) compatible /ɑ̃/ ; « g » 0,32 s, murmure voisé de 0,18 s puis relâchement et courte voyelle antérieure (F1 335 Hz, F2 2,4 kHz), donc type « gué », alors que « c » est un bruit seul de 0,1 s : traitement incohérent entre c et g ; « ien » 0,35 s, glissement de /i/ (F1 250 Hz) vers une voyelle de F1 690 Hz et F2 1690 Hz, compatible /jɛ̃/. Donc « en » vaut /ɑ̃/ seul et /ɛ̃/ dans « ien » : PhonoActif doit gérer la valeur selon le contexte.
- Constaté dans l'enregistrement « ien » : le même son (mesures identiques) sert à l'exercice « Trouve l'image » et à « Écris la graphie » ; l'item « ien » propose deux images à nez (une bleue à une bouche, une rouge et violette à deux bouches superposées), donc une paire nasale/nasale existe, mais avec des styles différents ; la bonne réponse (deux bouches pour i + en) copie la structure écrite « i en » ; messages « Essaie encore, tu peux réussir ! » puis « Bravo ! Tu as réussi l'exercice » avec 3 feuilles ; case de réponse à un tiret par lettre (« _ _ _ »), qui donne le nombre de lettres. Dépôt sur la zone verte : la couleur verte apparaît aussi pour une mauvaise image, donc ne pas la lire comme « correct ».
- Réponse de JF (2026-11-10) : la petite case de « Écris la graphie » est la réponse de l'apprenant, remplie par JF lui-même ; exercice complémentaire. Une icône d'oreille y tient lieu d'état vide. Parcours observé sur « on » : écoute (graphie visible) → glisser l'image → « Bravo ! » avec animation de forêt → fenêtre « Écris la graphie » qui cache la graphie (oreille) et les images (yeux fermés) → « Valider » → « Bravo, tu as trouvé la bonne graphie » avec laurier.
- Mesures de « ein » et « on », confirmées à l'oreille par JF (2026-11-10) : « ein » 0,23 s, F1 de 745 à 645 Hz avec bande large (signature nasale), F2 vers 1550 Hz, compatible /ɛ̃/, même profil que la fin de « ien » ; « on » 0,2 s, F1 vers 480 Hz, compatible /ɔ̃/ ; le son de « on » est identique dans les 3 lectures, y compris au dépôt de l'image ; un jingle de réussite (F0 d'environ 262 Hz, 0,5 s) est identique à celui de « ien ».
- Item « on » : les deux images fausses sont des bouches larges sans nez, la bonne a un nez et des lèvres arrondies ; nez et arrondi varient ensemble, donc réponse possible sans écouter. PhonoActif : un item ne doit pas être résoluble sur un seul indice visuel.
- Dictée d'un son : /ɛ̃/ s'écrit in, ain, ein (et un selon le cas). Le français est opaque dans le sens phonème vers graphème et régulier dans le sens graphème vers phonème [W7113321474]. PhonoActif : n'accepter que la graphie vue dans la séance, jamais n'importe quelle graphie valide, et l'indiquer à l'élève.
- Accents (2026-11-10, voix F0 d'environ 168 Hz) : « é » 0,2 s, voyelle unique F1 336 Hz et F2 2700 Hz, compatible /e/ ; « è » 0,18 s, F1 de 650 à 525 Hz et F2 vers 2550 Hz, compatible /ɛ/, profil proche de « ei » (F1 de 720 à 550 Hz). Écart de F1 d'environ 300 Hz entre é et è. Ni « e accent aigu » ni nom de lettre : un seul son bref. Confirmé à l'oreille par JF (2026-11-10).
- Code d'images observé (constaté) : bleu = consonne (rayons ou jets d'air), rouge = voyelle ; violet vu une fois dans « ien » (lecture non vérifiée). Dans les items « é » et « è », une seule image est rouge, les deux autres sont bleues : la bonne image se trouve par la couleur, sans écouter et sans distinguer é de è. Dans ces deux items l'app ne teste donc pas é contre è. PhonoActif : un item d'accent doit proposer l'autre accent comme distracteur, avec deux images de même couleur.
- Dans « è », au moins une erreur avant la bonne image : « Essaie encore » puis « Réessayer ». Le son de l'image fausse est un bruit bref d'environ 0,09 s, non périodique, non identifié.
- « in » et « b » (2026-11-10, confirmés à l'oreille par JF) : « in » 0,23 s, F1 environ 660 Hz avec bande large, F2 de 1530 à 1460 Hz, compatible /ɛ̃/, profil proche de « ein » (F1 745 à 645 Hz, F2 1580 à 1450 Hz) mais fichier différent. « b » 0,37 s : murmure voisé de 0,27 s (énergie sous 500 Hz), puis relâchement et voyelle brève d'environ 0,08 s (F1 vers 570 Hz, F2 vers 1730 Hz), de type schwa. Quatre occlusives, deux classes : sourdes = bruit seul sans voyelle (« c » 0,1 s, « p » 0,13 s) ; sonores = murmure voisé puis voyelle brève, différente selon la lettre (« g » /e/, « b » schwa). PhonoActif : un seul choix de voyelle d'appui pour les sonores. « p » (2026-11-10, confirmé à l'oreille par JF) : bruit non périodique de 0,13 s, centroïde 0,8 à 1,6 kHz (plus grave que « c », vers 2,5 à 3,4 kHz), compatible avec un /p/ ; son niveau d'environ 14 dB au-dessus de « c » si le niveau d'enregistrement est comparable (non vérifié) : à contrôler, un son trop fort sur un enfant sensible est un risque.
- Item « p » (constaté) : bonne image = lèvres closes bleues à rayons ; distracteurs = lèvres rouges à nez et bleues ouvertes avec dents : pas de « b » ni de « m » proposés, la fermeture des lèvres suffit à répondre. Parcours identique aux autres items.
- Syllabes (2026-11-10, « gè » confirmé /ʒɛ/ à l'oreille ; « se » confirmé /sə/ (voyelle de « le ») à l'oreille par JF le 2026-11-10) : l'item est « gè » (accent grave, confirmé par JF ; le fichier vidéo est nommé « gé » par erreur), deux tuiles séparées « g » et « è » ; la dictée s'intitule « Écris la syllabe » avec deux cases. Les images composent consonne bleue et voyelle rouge ; ondes de vibration pour une consonne voisée, nez pour une consonne nasale. Les distracteurs forment de vraies paires minimales (même image sans ondes, ou avec nez) : meilleur design que les items à une lettre. Dans « se », l'image à ondes (voisée) est refusée.
- Son d'une syllabe : « gè » 0,33 s, friction voisée de 0,16 s (3,4 à 3,9 kHz) compatible /ʒ/, puis voyelle de 0,13 s (F1 340 à 400 Hz, F2 vers 2100 Hz) : le « g » devient /ʒ/ devant è, alors que « g » seul donne /g/ ; ma mesure penchait vers /e/ (F1 de é : 300 Hz, de è : 600 Hz) mais l'oreille de JF entend /ʒɛ/ comme dans « geai » (confirmé le 2026-11-10) : la mesure était fausse. Les formants d'une voyelle de 0,13 s après une fricative sont peu fiables : ne jamais conclure sur un accent sans oreille humaine. « se » 0,35 s, friction de 0,17 s à 5,4 à 5,7 kHz (/s/) puis voyelle de 0,15 s, F1 vers 300 Hz et F2 vers 1700 Hz, fermée : ambiguë entre schwa arrondi, /ø/ et /y/. L'image déposée joue son propre son, y compris l'image fausse.
- Système de pictogrammes déduit des images (non vérifié par l'éditeur) : bleu = consonne, rouge = voyelle, nez = nasalité, rayons = explosion (p), ondes de vibration sous les lèvres closes = voisement (b), jets d'air = frication. Bon principe : il montre le voisement, que la bouche seule ne montre pas. Dans « in » (cette vidéo) : une image rouge à nez (bonne), une bleue à nez (consonne nasale), une bleue sans nez ; la seule image rouge est la bonne. Dans « b » : bonne image = lèvres closes bleues à ondes ; les distracteurs (lèvres rouges arrondies, bleues avec dents et rayons) ne sont pas un « p » : pas de paire p/b dans cet item. Pour PhonoActif : jouer un phonème consonantique deux fois avec une courte pause, pour ne pas dépendre d'un son de 0,1 s.
- Affichage des digrammes : correction du 2026-11-10 : l'espace vu dans « o i » est l'espacement des lettres de la case de réponse que JF remplit lui-même, appliqué à toutes les lettres (« e i n », « e n »), pas un défaut d'affichage du digramme. PhonoActif : afficher « oi », « on », « in » comme une seule unité (arc ou soulignement) dans l'écran d'apprentissage. Appui RISS : les graphèmes complexes sont un facteur de difficulté en lecture et en dictée [W4206889080] ; la mise en évidence des digrammes par couleur est décrite dans [dumas-01999507] (mémoire).
- Une étude belge (UMONS, ULB) existe sur la production et la perception des nasales chez des enfants de 5 à 12 ans : [hal-02798539]. Elle porte sur des enfants implantés comparés à des enfants entendants, pas sur des images de bouche pour l'école.

## Accessibilité
Police ≥ 16 px (Arial pour les supports imprimés AU, Arial 12), icônes toujours avec libellé, tap en alternative au glisser-déposer, contraste suffisant, aucune animation parasite, option sans bouche, option sans nom de lettre.

## Sources belges sur la bouche (état de la recherche, 2026-11-10)
Constaté :
- Engwall, Delvaux & Metens (2006), "Interspeaker variation in the articulation of nasal vowels", Proc. 7th ISSP, 3-10 : IRM, 2 hommes et 2 femmes, français de Belgique. Vu seulement via la citation dans Carignan, ICPhS 2011 ; l'article lui-même n'a pas été lu.
- Delvaux, Metens & Soquet (2002), "French nasal vowels: acoustic and articulatory properties", Proc. ICSLP, 53-56 : IRM temps réel à 5 images/s, voyelles du français de Belgique d'après Proctor et al. Titre seul vérifié, article non lu.
- Delvaux (2012-2013), Les voyelles nasales du français, Peter Lang, 256 p., payant : voyelles nasales uniquement ; la page ne dit pas que les locuteurs sont belges.
Non vérifié : tout ce qui concerne les consonnes, les voyelles orales et un usage pédagogique.
Limites : recherche fondamentale sur voyelles nasales, aucune source belge pédagogique trouvée pour les gestes de bouche ; aucune n'est un référentiel validé pour des images d'élèves.
Pistes de validation humaine : laboratoire de phonétique UMONS (Delvaux) ; Maillart (ULiège, supports de rééducation sur Orbi, non lus) ; cours de phonétique articulatoire UCLouvain LLOGO1211 et ULB LING-B9201 ; logopède du Pôle.

## Références RISS déjà vues (extraits, pas lectures intégrales)
[hal-04561796] Sprenger-Charolles & Ziegler 2024 ; [hal-02334227] Ziegler 2018 ; [hal-04542179] Vazeux et al. 2023 ; [hal-01887328] Kuster-Besnier 2009 ; [hal-01841447] Vantomme 2014 ; [dumas-01069881] Marcussy 2014 ; [hal-01816183] Menin-Sicard & Sicard 2012 ; [dumas-03771138] Haren 2022 ; [dumas-04485569] Froger 2023 ; [hal-04317304] Sancier 2022 ; [hal-04314092] Piquard-Kipffer et al. 2024 ; [tel-05293941] Delmas 2025 ; [tel-02615944] Caudrelier 2019 ; [W2114172735] Durand 2014 (schwa).
Niveau de preuve : les `dumas-` et `tel-` sont des mémoires et thèses non revues par les pairs ; aucune de ces références ne démontre qu'un geste de bouche améliore la lecture. À chercher avant d'affirmer un bénéfice.

## Plan par lots
1. Moteur graphème → phonème + tests (sans audio réel, sons de test).
2. Enregistrement et validation de 20 phonèmes + syllabes CV (niveau 1-2) avec logopède.
3. Parcours élève + aide graduée ; test sur 3 élèves.
4. Compte enseignant, listes, IA, RLS, migration (accord JF).
5. Vignette portail-plai, mode d'emploi, recette appareils.

## Décisions ouvertes pour JF
- Voix et visage : qui, quel accent de référence, accord image.
- Avatar : oui ou non.
- App PLAI nouvelle ou retour aux auteurs de PhonoFusion.
- Niveau scolaire exact.
