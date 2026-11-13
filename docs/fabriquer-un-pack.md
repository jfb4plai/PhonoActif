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
