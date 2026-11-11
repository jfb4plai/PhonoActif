# Recette de l'app élève (socle)

Objectif : jouer le jeu de construction de mot comme un élève, vérifier ce que Claude ne peut pas constater (le son entendu, le toucher sur tablette), et récupérer les essais.
Durée : environ 20 minutes. Matériel : ordinateur de JF avec Chrome ; si possible une tablette sur le même réseau.

## Étape 1 : démarrer l'app

Dans PowerShell, en une seule ligne :

```powershell
cd "C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif"; npm run dev
```

Attendu : une ligne `Local: http://localhost:5199/`. Laisser la fenêtre ouverte.

Si les sons ou le pack d'essai manquent (dossiers `public\sons` et `public\packs\demo` absents), les recréer :

```powershell
cd "C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif"; node tools/pack_demo.js; node tools/copier_sons.js "C:\Users\jfbeg\OneDrive\enseignement\pôle territorial\outils numériques\0 outils PLAI numériques au service de l'enseignant\Lilémo numérique\sons"
```

## Étape 2 : ouvrir une tâche (habillage album, cartes sans le mot)

Coller dans Chrome :

`http://localhost:5199/#/jeu?pack=demo&mode=sans&habillage=album`

Attendu : l'écran d'accueil PLAI, le champ « Code de l'élève », le pack « demo » déjà rempli.

## Étape 3 : jouer 3 cartes

1. Écrire un code (par exemple `E07`), cliquer **Commencer**.
2. Pour chaque carte, cocher ce que vous constatez :

| Carte | Je comprends l'image | Taper une pièce joue son son | **Écouter** joue le mot | Bravo si juste | Message encourageant si faux |
|---|---|---|---|---|---|
| 1 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 2 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 3 | [ ] | [ ] | [ ] | [ ] | [ ] |

3. Faire une erreur volontaire trois fois de suite sur une carte : attendu, le mot s'affiche après le troisième essai, sans score.
4. Essayer **Besoin d'aide ?** deux fois : la première réécoute le mot, la seconde donne le premier graphème à poser.

Note à écrire : les sons enchaînés d'un mot (« ch », « a ») sonnent-ils comme le mot ? Quels mots sonnent faux ?

## Étape 4 : cartes avec le mot, habillage sobre

`http://localhost:5199/#/jeu?pack=demo&mode=avec&habillage=sobre`

Attendu : la carte montre le mot imprimé sous l'image ; couleurs plus sobres ; les mots restent en Arial.

## Étape 5 : une seule carte par adresse (lien, QR ou NFC)

`http://localhost:5199/#/carte/demo/chat`

Attendu : après le code, une seule carte (« Carte 1 sur 1 »), puis « Pack terminé ». Une adresse dont l'identifiant n'existe pas (`#/carte/demo/zzz`) donne le message « Cette carte n'existe pas dans ce pack ».

## Étape 6 : tablette

Sur une tablette, ouvrir `http://<adresse IP de l'ordinateur>:5199/#/jeu?pack=demo&mode=sans&habillage=album` (le serveur doit accepter le réseau : relancer avec `npm run dev -- --host`). Taper les pièces avec le doigt. Noter : les pièces sont-elles assez grandes ? Le son se joue-t-il au premier tap (certains navigateurs bloquent le son avant un premier toucher) ?

## Étape 7 : récupérer les essais

1. Revenir à l'accueil (« Retour à l'accueil »).
2. Cliquer **Exporter les essais (CSV)**. Attendu : un fichier `essais.csv` dans `C:\Users\jfbeg\Downloads\`.
3. L'ouvrir dans Excel : une ligne par essai, colonnes `date;code;pack;carte;mot;mode;tentative;juste;aide;positions`. Les accents s'affichent-ils bien ? Le séparateur « ; » découpe-t-il les colonnes ?

## Ce qui n'est pas vérifié par Claude (à constater par JF)

- Le **son** : Claude n'entend rien. Seule l'oreille de JF dit si l'enchaînement des sons est compréhensible.
- Le **toucher réel sur tablette** et les tailles de doigt ; les navigateurs de tablette qui bloquent le son avant un premier tap.
- Le **téléchargement des essais** dans Chrome et l'ouverture du CSV dans Excel.
- Le **rendu avec de vraies cartes** : le pack d'essai a des dessins provisoires, pas vos cartes Canva ni des photos.
- La **conservation des essais** quand le navigateur est fermé puis rouvert (stockage local de Chrome sur `localhost`).
