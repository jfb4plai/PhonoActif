# Registre de traitement : PhonoActif (brouillon)

Statut : brouillon rédigé par Claude le 2026-11-11 pour JF (DPO du Pôle). Les cases `[à décider par JF]` ne sont pas tranchées. Rien n'est en production.

## 1. Traitement

| Rubrique | Contenu | Source |
|---|---|---|
| Nom | PhonoActif (version numérique de l'entraînement phonème-graphème) | décision JF 2026-11-11 |
| Responsable du traitement | `[à décider par JF : Pôle Territorial de la Ville de Liège ou autre entité]` | non donné |
| DPO | Jean-François Beguin | JF 2026-11-11 |
| Finalité | Entraîner l'association sons-lettres ; donner à l'enseignant les liaisons graphème-son à retravailler et, avec son accord, à un intervenant extérieur | design, section 11 bis |
| Base légale | `[à décider par JF]` (consentement des représentants légaux via case à cocher de l'enseignant, ou mission d'intérêt public) | non tranché |

## 2. Personnes et données

| Personnes | Données | Remarque |
|---|---|---|
| Élèves | Code anonyme choisi par l'enseignant (1 à 12 caractères, pas de nom), liaisons graphème-son jouées, mot, numéro de tentative, juste/faux, aide utilisée, date | table `phono_attempts`; la correspondance code-élève reste sur papier chez l'enseignant |
| Enseignants | E-mail du compte PLAI, rôle dans la classe (master ou invité), nom de classe | tables `phono_classes`, `phono_class_members` |
| Intervenant extérieur (logopède) | Partage du tableau de bord d'un élève | non construit en V1 |

Aucune donnée de catégorie particulière n'est saisie. `[à décider par JF : un profil de difficultés par code reste-t-il une donnée de santé indirecte ? À examiner avec l'enseignant utilisateur.]`

## 3. Hébergement et transferts

- Base : Supabase, projet partagé du Pôle, région Europe (réponse JF « europe »). `[à vérifier par JF : région réelle du projet dfoaumjleqtxjeaplnna, non contrôlée par moi]`
- Application : Vercel (hébergement du site statique). `[à décider par JF : transferts hors UE et garanties]`
- Aucun appel à une IA. Les mots sont choisis par l'enseignant ou par filtres déterministes.

## 4. Accès

- L'élève n'a pas de compte : il ouvre un lien ou un QR-code de tâche et saisit son code. Il peut seulement lire les réglages de la tâche et envoyer des essais (fonctions `phono_lire_tache`, `phono_envoyer_essais`).
- L'enseignant lit les résultats des classes dont il est membre (RLS).
- Le master invite et supprime ; l'invité lit et ajoute.

## 5. Durées de conservation

| Donnée | Durée | Source |
|---|---|---|
| Lien de tâche | `[à décider par JF : la réponse « 30 jours » n'a pas été reliée à une rubrique précise]` | |
| Essais des élèves | purge annuelle `[à décider par JF : date, ex. 31 août]` | JF : « purge annuelle » |
| Copie locale dans le navigateur de l'élève | jusqu'à envoi puis effacement du navigateur | `[à vérifier]` |

La purge annuelle n'est pas encore programmée.

## 6. Droits des personnes

`[à décider par JF]` : procédure d'accès, de rectification et d'effacement. Point d'appui technique : l'enseignant master peut retirer un code et supprimer une classe (suppression en cascade des essais, à confirmer par test sur la base réelle).

## 7. Sécurité

- RLS sur toutes les tables `phono_*`; adhésion contrôlée par fonctions `security definer`.
- Fonctions appelables par `anon` limitées à la lecture d'une tâche par jeton (24 caractères hexadécimaux) et à l'envoi d'essais validés (200 lignes au plus, rejet de tout le lot si une ligne est invalide).
- Tests SQL sur PostgreSQL simulé (PGlite) : 32 tests. Non encore exécutés sur la base réelle.

## 8. Analyse d'impact (AIPD)

`[à décider par JF : nécessaire ou non ; mineurs + profil d'apprentissage]`

## 9. Points ouverts

- Responsable du traitement, base légale, durées, procédure des droits, AIPD.
- Mention d'information destinée aux représentants légaux : à rédiger.
- Partage avec logopède : à spécifier (jeton temporaire, consentement) avant construction.
