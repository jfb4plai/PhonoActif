# Recette de la revue des sons

Objectif : vérifier à l'oreille les sons proposés pour les mots à code inconnu, corriger, valider, puis enregistrer le travail.
Durée : environ 20 minutes pour 10 mots. Matériel : Chrome (ou Edge) sur l'ordinateur de JF, haut-parleurs ou casque.

## Étape 1 : générer la page

Ouvrir PowerShell et lancer, en une seule ligne :

```powershell
cd "C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif"; node tools/construire_revue.js --sons "C:\Users\jfbeg\OneDrive\enseignement\pôle territorial\outils numériques\0 outils PLAI numériques au service de l'enseignant\Lilémo numérique\sons" --limite 300
```

Résultat attendu : une ligne `…\phonoactif\revue\revue.html : 300 mots, 0.08 Mo`.

## Étape 2 : ouvrir la page

Coller cette adresse dans la barre d'adresse de Chrome :

`file:///C:/Users/jfbeg/OneDrive/claude-workspace/phonoactif/revue/revue.html`

Attendu : titre « Revue des sons », le mot « lui » avec la raison « code inconnu : 8 », ses graphèmes `l.u.i`, trois lignes de sons.

## Étape 3 : écouter 10 mots

1. Écrire mon nom ou mes initiales dans **Auteur**.
2. Pour chaque mot : cliquer **Écouter le mot** (ou la flèche ▶ d'un graphème) et noter le résultat.

| Mot | Son juste | Son faux | Son absent (message « Son absent : … ») |
|---|---|---|---|
| 1. | [ ] | [ ] | [ ] |
| 2. | [ ] | [ ] | [ ] |
| 3. | [ ] | [ ] | [ ] |
| 4. | [ ] | [ ] | [ ] |
| 5. | [ ] | [ ] | [ ] |
| 6. | [ ] | [ ] | [ ] |
| 7. | [ ] | [ ] | [ ] |
| 8. | [ ] | [ ] | [ ] |
| 9. | [ ] | [ ] | [ ] |
| 10. | [ ] | [ ] | [ ] |

Attendu : six sons n'ont pas encore de fichier (`eu_ouvert`, `i`, `o_ferme`, `o_ouvert`, `schwa`, `yod`) : les mots qui les utilisent affichent « Son absent : … ». Ce n'est pas une erreur de la page.

## Étape 4 : valider et corriger

- Mot dont le son est juste et dont rien n'a changé : cliquer **Valider tel quel**.
- Mot dont un son est faux : changer la liste « Son » du graphème (bouton **+ son** pour un second son, par exemple `e_ouvert` puis `yod`), écrire la **Raison de la correction**, cliquer **Enregistrer ma correction**.
- Mot dont le découpage est faux : changer le champ **Graphèmes** (points entre les graphèmes).
- Mot à laisser pour plus tard : **Passer**.

## Étape 5 : fermer et rouvrir (brouillon)

Appuyer sur F5 (recharger la page). Attendu : le compteur « décidés : N » est conservé et le mot en cours garde mes changements. Si la page affiche « ce navigateur refuse la sauvegarde automatique », exporter après chaque série de mots.

## Étape 6 : exporter et importer

1. Cliquer **Exporter mes corrections**. Attendu : un fichier `corrections-AAAA-MM-JJ.json` dans `C:\Users\jfbeg\Downloads\`.
2. Dans PowerShell (remplacer la date) :

```powershell
cd "C:\Users\jfbeg\OneDrive\claude-workspace\phonoactif"; node tools/importer_corrections.js "C:\Users\jfbeg\Downloads\corrections-AAAA-MM-JJ.json"; node tools/revue_liste.js --limite 5
```

Attendu : `importées=N rejetées=0`, puis une file de revue plus courte de N mots, et la ligne « corrections : N (…) ».

## Ce qui n'est pas vérifié par Claude (à constater par JF)

- Le **son** lui-même : Claude n'entend rien. Seule l'oreille de JF dit si un son est juste.
- La **sauvegarde automatique** sur `file:///` dans Chrome : le navigateur intégré à l'outil de Claude la refuse, donc Claude n'a vu que le message d'avertissement.
- Le **téléchargement réel** du fichier : le navigateur intégré n'enregistre pas les téléchargements. Claude a vérifié le contenu exact du fichier exporté (deux corrections valides) et l'import de ce contenu, pas le clic de téléchargement.
- La lecture de **mots à plusieurs mots** dans la page : la logique est testée, mais aucun mot à plusieurs mots n'est dans la file tant que vous n'avez pas fourni de liste.
