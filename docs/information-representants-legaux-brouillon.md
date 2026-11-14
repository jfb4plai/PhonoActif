# PhonoActif : information aux représentants légaux (BROUILLON du 2026-11-14)

Statut : brouillon rédigé par Claude pour Jean-François Beguin (DPO du Pôle). Les cases `[À DÉCIDER]` ne sont pas tranchées : voir la section « Décisions à prendre » en fin de document. Le texte du courrier ne doit pas être diffusé tant que ces cases ne sont pas résolues. Chaque fait décrit ci-dessous est celui de la page « Gestion des données » du site (`#/donnees`) et du schéma de base (`supabase/migrations/`).

---

## 1. Le courrier (à adapter par l'enseignant)

**Objet : un outil numérique pour apprendre à relier les sons et les lettres (PhonoActif)**

Madame, Monsieur,

Votre enfant va utiliser en classe, avec l'aide de son enseignant, un outil nommé **PhonoActif**. Il sert à s'entraîner à relier les sons et les lettres : l'élève pose des lettres une à une et une voix lit ce qu'il a posé. Cet outil est proposé par le Pôle Liégeois d'Accompagnement vers une École Inclusive (PLAI). `[À DÉCIDER : entité responsable, voir D1]`

**Ce qui est enregistré.** Votre enfant n'est jamais désigné par son nom : l'enseignant lui donne un code (par exemple « E07 »), et la correspondance entre le code et l'enfant reste sur papier chez l'enseignant. Quand votre enfant joue avec son lien ou son QR-code personnel, l'outil enregistre : son code, le mot proposé, ce qu'il a posé, si c'est juste ou faux, l'aide demandée et la date. Rien d'autre : pas de nom, pas de photo, pas de voix, pas de localisation.

**À quoi cela sert.** L'enseignant voit quelles associations entre un son et une lettre sont plus difficiles pour l'enfant, pour adapter ses activités. L'outil ne prend aucune décision à propos de votre enfant et ne le note pas.

**Qui voit ces informations.** Les enseignants de la classe, et eux seuls. `[À DÉCIDER : partage éventuel avec un logopède ou un intervenant extérieur, voir D6]`

**Où elles sont gardées.** Dans une base de données située en Europe (Irlande), partagée par plusieurs outils du Pôle. Le site est hébergé par la société Vercel. `[À DÉCIDER : garanties pour les transferts éventuels hors Union européenne, voir D4]`

**Aucune intelligence artificielle** ne reçoit les informations de votre enfant. La voix est faite de fichiers audio préparés à l'avance. Il n'y a ni publicité ni mesure d'audience, et aucune société tierce ne suit les visites.

**Combien de temps.** `[À DÉCIDER : durée, voir D3. Proposition : les informations sont supprimées à la fin de l'année scolaire, avant le 31 août.]`

**Vos droits.** Vous pouvez demander à voir les informations enregistrées à propos de votre enfant, à les faire corriger ou supprimer, ou vous opposer à leur utilisation. Pour cela, parlez-en à l'enseignant, qui peut supprimer le code de votre enfant (ses essais disparaissent avec lui), ou écrivez à : `[À DÉCIDER : adresse de contact DPO, voir D7]`. Vous pouvez aussi vous adresser à l'Autorité de protection des données (Belgique) `[coordonnées à vérifier]`.

**Et si je ne souhaite pas que mon enfant utilise cet outil ?** `[À DÉCIDER : voir D2. Si la base légale est la mission d'intérêt public : « Votre enfant pourra faire les mêmes activités sans l'outil, sur papier, sur simple demande à l'enseignant. » Si c'est le consentement : coupon-réponse ci-dessous.]`

**Un souci ou une question ?** jeanfrancois.beguin@ens.ecl.be

L'enseignant  `[nom, école, date]`

### Coupon-réponse (seulement si la base légale retenue est le consentement, voir D2)
Je soussigné(e) …, responsable légal de …, autorise / n'autorise pas l'utilisation de PhonoActif décrite ci-dessus.  Date et signature : …

---

## 2. Version courte, à lire à l'élève (inclusion, FALC)

- Ton enseignant te donne un code.
- Ton nom n'est jamais demandé.
- L'outil garde ce que tu poses, pour aider ton enseignant.
- Tu peux demander d'arrêter.

---

## 3. Décisions à prendre (DPO)

| # | Décision | Options | Ma recommandation | Pourquoi |
|---|---|---|---|---|
| D1 | **Responsable du traitement** | (a) le Pôle territorial de la Ville de Liège ; (b) l'école ou son pouvoir organisateur, avec le Pôle comme prestataire | `[ton choix]` | Le choix change qui signe le courrier et qui répond aux droits. Je ne connais pas l'organisation juridique du Pôle. |
| D2 | **Base légale** | (a) mission d'intérêt public (art. 6.1.e RGPD) : l'enseignement ; (b) consentement des représentants légaux | (a), si l'usage se fait dans le cadre de la mission d'enseignement, avec un droit d'opposition et une alternative sans l'outil | Le consentement est difficile à rendre libre dans une classe. Aucune donnée de santé n'est saisie, mais voir D5. À confirmer par toi : je ne suis pas juriste. |
| D3 | **Durée de conservation** | (a) fin de l'année scolaire (31 août) ; (b) 12 mois après le dernier essai ; (c) jusqu'à suppression par l'enseignant | (a) | C'est ta demande de « purge annuelle ». **La purge n'est pas encore programmée** (audit S8) : ne pas l'annoncer dans le courrier tant qu'elle n'existe pas, ou la programmer d'abord. |
| D4 | **Transferts hors UE** | Vérifier : région réelle de Vercel (non contrôlée par moi) ; clauses contractuelles de Supabase et de Vercel | `[à vérifier]` | La base est en Irlande (constaté dans ta liste de projets Supabase). Le site statique est chez Vercel, dont je n'ai pas vu la région ni le contrat. |
| D5 | **Analyse d'impact (AIPD)** | (a) la faire ; (b) consigner pourquoi elle n'est pas nécessaire | (a) légère, ou (b) argumentée | Il s'agit de mineurs, de données sur les performances d'apprentissage qui, pour un enfant, peuvent laisser deviner une difficulté (dyslexie). Ce n'est pas une donnée de santé saisie, mais la question se pose. Pas d'évaluation systématique à grande échelle ni de décision automatisée, ce qui joue en faveur de (b). |
| D6 | **Partage avec un logopède ou un intervenant** | (a) jamais ; (b) sur accord écrit des représentants légaux, avec jeton temporaire | (a) pour la version actuelle : ce n'est pas construit | Si tu veux l'annoncer, il faut le construire d'abord. |
| D7 | **Contact DPO affiché** | (a) jeanfrancois.beguin@ens.ecl.be (déjà dans le pied de page du site) ; (b) une adresse dédiée au Pôle | (a) pour l'instant | Le pied de page du site affiche déjà l'adresse (a). |
| D8 | **Registre de traitement** | Reporter les décisions D1 à D7 dans `docs/registre-traitement-phonoactif.md` | Oui | Ce document n'a pas été mis à jour après le plafond d'envoi, la clé par élève et les nouvelles pages. |

### Ce que le courrier ne dit pas encore
- Les enfants de **moins de 13 ans** peuvent recevoir un lien personnel : c'est l'enseignant qui le remet, pas l'enfant qui crée un compte. Aucun compte élève n'existe.
- **Sous-traitants** : Supabase (base), Vercel (site). Les accords de sous-traitance ne sont pas à ma connaissance vérifiés.
- **Notification en cas de violation de données** : procédure non écrite.

### Ce qui reste à faire côté technique avant d'écrire « la purge existe »
- Programmer la purge annuelle (tâche planifiée Supabase) : audit S8.
- Écrire la procédure d'effacement d'un élève à la demande d'un représentant légal : aujourd'hui, l'enseignant responsable de classe clique sur « Retirer » à côté du code (les essais doivent partir avec lui par suppression en cascade ; à contrôler dans Supabase, voir les sources ci-dessous).
- Une expiration des jetons de tâche (audit S5).

### Sources des faits énoncés
| Fait | Source |
|---|---|
| Aucun nom, un code anonyme | page `#/donnees` ; `src/app/code.js` (1 à 12 caractères, lettres, chiffres, tiret) |
| Données enregistrées (code, mot, posé, juste/faux, aide, date) | `supabase/migrations/20261112000000_phono_init.sql`, table `phono_attempts` |
| Base en Irlande | `supabase projects list` du 2026-11-14 : « West EU (Ireland) » |
| Aucune IA, pas de service tiers dans les pages | recherche dans `src/` le 2026-11-14 : aucune URL externe, aucun appel à un service d'IA |
| Retirer un code supprime ses essais | déduit de la clé étrangère `on delete cascade` (`phono_attempts.student_id`) ; essai du 2026-11-14 : le code retiré a disparu de la liste ; je n'ai pas relu la table pour confirmer la disparition des 4 essais (accès direct interdit à la clé publique) : à contrôler dans le tableau de bord Supabase |
