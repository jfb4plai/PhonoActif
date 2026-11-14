# Fabriquer un pack à partir du tableau d'un enseignant (pour JF ou un administrateur)

Décision du 2026-11-13 (option « a ») : l'enseignant remplit un modèle Excel et envoie le tableau avec ses images ; JF ou un autre administrateur fabrique le pack. La voix (Azure) et les images restent sous des comptes centraux, donc un seul coût pour tous.

**Le modèle à donner aux enseignants :** `public/modeles/modele-pack-plai.xlsx` (en ligne : `/modeles/modele-pack-plai.xlsx` ; l'espace enseignant propose le lien). Il se régénère avec `python -I tools/modele_pack_xlsx.py creer`.

## Pas à pas

Dossier de travail : `C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif`

1. **Recevoir** le tableau (`.xlsx`) et le dossier d'images. Ne rien ouvrir d'autre que le tableau.
2. **Lire et vérifier le tableau**, copier les images dans le pack :
   ```powershell
   python -I tools/modele_pack_xlsx.py lire "C:\chemin\tableau.xlsx" --images "C:\chemin\images"
   ```
   Les mots ou images refusés sont listés en « avertissement » (mot non accepté, doublon, image sans source ou licence, fichier introuvable). Seuls les problèmes de la feuille « Pack » et l'absence de tout mot valide bloquent. Ajouter `--remplacer` pour refaire un pack existant.
3. **Construire le pack** (états lettre par lettre, manifeste, liste des fichiers audio) :
   ```powershell
   node tools/construire_pack_atelier.js nom-du-pack
   ```
   Un mot absent du lexique de lecture (pluriel, forme conjuguée, nom propre, mot rare) est écarté et signalé. `--inclure-a-verifier` le garde avec une lecture par règles non vérifiée : à n'utiliser qu'en écoutant le résultat.
4. **Générer l'audio** (clé Azure, par JF) :
   ```powershell
   python -I essai-tts-ipa/generer-bibliotheque.py pack nom-du-pack
   ```
   Les fichiers déjà générés pour d'autres packs sont réutilisés. Sortie : `public/packs/nom-du-pack/audio/`.
5. **Écouter un échantillon**, puis jouer le pack : `npm run dev`, adresse `http://localhost:5199/#/jeu?pack=nom-du-pack&mode=sans`.
6. **Pack « à partager avec tous »** : cohérence graphique relue par JF et un autre administrateur (style papier découpé, un seul objet, fond uni, sans texte ni visage).
7. **Publier** : `npx vite build`, puis commit et push (accord de JF). Le pack apparaît dans la liste des packs (`public/packs/index.json`).

## Écoute par syllabes

- Le constructeur ajoute à chaque carte les **syllabes** du mot (coupées sur les sons du mot entier) et les fichiers audio correspondants : ils sont réutilisés s'ils existent déjà dans la bibliothèque, sinon à générer avec la même commande que les états.
- Dans le jeu, un mot de **deux syllabes ou plus** reçoit un bouton « Écouter par syllabes » : syllabes l'une après l'autre, espace de 500 ms, dernière syllabe à 75 % de la vitesse (hauteur conservée). Valeurs choisies à l'oreille par JF, modifiables dans `src/jeu/modeA.js` (`REGLAGES_SYLLABES`). Pas de bouton pour un mot d'une seule syllabe. Pendant l'écoute, la syllabe lue est surlignée dans la zone de construction, un trait marque la coupure et les lettres muettes sont grisées (le manifeste porte `cubes`, nombre de graphèmes par syllabe ; un ancien manifeste sans ce champ garde l'écoute, sans surlignage).
- **Réglage de tâche « Écoute par syllabes »** (2026-11-14) : « pour tous les mots » (par défaut), « seulement quand l'élève a du mal » (le bouton apparaît sur une carte après une erreur ou un clic sur « Besoin d'aide ? »), « jamais ». Le réglage ne lit rien tout seul : il rend le bouton disponible. Il se choisit à la création de la tâche (migration `20261114010000_phono_syllabes.sql`) ou dans le lien rapide (`&syllabes=non|toujours|aide`).
- **Ajouter les syllabes à un pack déjà fabriqué** (cas de `p1-100`) : `node tools/ajouter_syllabes_pack.js <pack>` écrit la liste des fichiers à produire et n'ajoute au manifeste que les mots dont tous les fichiers de syllabes sont présents ; puis `python -I essai-tts-ipa/generer-bibliotheque.py pack <pack>` (clé Azure, par JF) ; puis relancer l'outil.
- Un pack sans syllabes dans son manifeste n'a pas le bouton. C'est le cas de `p1-100` (fabriqué avec `tools/mode_a_mots.js`, pas avec cette chaîne) : pour lui donner le bouton, il faudrait le refaire avec la chaîne ci-dessus (tableau Excel puis `construire_pack_atelier.js`).

### Règle de coupure des syllabes (à reprendre dans tout mode d'emploi)

> Règle de coupure : on coupe sur les sons, pas sur les lettres. Une seule consonne entre deux voyelles passe avec la syllabe suivante (vé-lo). Deux consonnes se séparent (tak-si, tor-tue), sauf consonne + r ou l (ta-ble, li-vre). La lettre muette reste avec la syllabe qui la précède.

Source : règles recoupées avec la syllabation de Lexique 4.1 (`docs/rapport-lexique-org.md`) ; « taxi » = tak-si, décision de JF le 2026-11-14. La même phrase s'affiche sous la zone de construction pendant l'écoute (`REGLE_COUPURE` dans `src/jeu/modeA.js`). Le code est dans `src/core/syllabes.js`.

## Ajouter des images à un pack déjà fabriqué

`node tools/ajouter_images_pack.js <pack> --dossier <dossier-d-images> [--dossier <autre>]` : pour chaque carte dont le fichier `<mot sans accent>.png` existe dans l'un des dossiers (le premier trouvé l'emporte), copie l'image dans `public/packs/<pack>/images/` et renseigne `image_sans_mot`, `source` et `licence` (par défaut : image générée par IA, Canva). Les cartes sans image ne changent pas ; relançable après chaque nouvelle image. Exemple du pack de 100 mots : `--dossier docs/images-canva/lot2 --dossier public/packs/p1-20-images/images` (25 mots illustrés sur 100).

## Pack « pour mon usage »

- Le pack n'est proposé que dans l'espace enseignant du compte dont l'adresse est dans le tableau.
- L'adresse e-mail n'est jamais écrite en clair dans les fichiers publics (manifeste, index) : seule une **empreinte** (SHA-256) l'est. C'est de la pseudonymisation, pas de l'anonymat : quelqu'un qui connaît une adresse peut vérifier qu'elle correspond.
- Ce n'est pas un coffre-fort : le dossier du pack reste lisible par quiconque connaît son adresse exacte. Le tableau ne doit contenir aucune donnée personnelle ni confidentielle.
- Le dossier `data/packs-atelier/` (qui contient l'adresse en clair) est ignoré par Git.

## Limites connues

- Aucun dépôt automatique par l'enseignant : le chemin est « envoi à JF ou à un administrateur ».
- Pas de pluriel, de conjugaison ni de nom propre tant que le lexique ne les contient pas.
- Les phrases d'aide sont conservées dans le manifeste mais pas encore lues par l'application.
- La voix lit l'IPA du lexique ; la justesse de lecture est mesurée sur des mots du lexique, pas sur d'autres.
- Sans rôle d'administrateur dans la base, la centralisation (bibliothèque commune, validation) reste un processus humain.

## Fichiers

`tools/modele_pack_xlsx.py` (modèle et lecteur), `src/core/packAtelier.js` (construction du pack, empreinte, visibilité), `tools/construire_pack_atelier.js`, `essai-tts-ipa/generer-bibliotheque.py` (commande `pack`), tests : `tools/test_modele_pack_xlsx.py`, `tests/core/pack-atelier.test.js`, `tests/enseignant/packs-personnels.test.jsx`.
