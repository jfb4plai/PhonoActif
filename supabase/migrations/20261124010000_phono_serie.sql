/* Série de mots d'une tâche de maternelle (TBI et feuille à imprimer, JF 2026-11-24, option 2) : la série (mêmes mots, même ordre, mêmes lettres)
   est fixée par une graine et un nombre de mots. Les enregistrer dans la tâche permet de retrouver, de réimprimer et de renouveler la série depuis la liste des tâches.
   Ajout compatible : colonnes facultatives (null = pas de série), aucune fonction modifiée (les liens du tableau et de la feuille portent graine et nb dans l'adresse).
   Sans cette migration, le code n'envoie ces colonnes que pour une tâche de maternelle, lit les tâches avec select('*') et traite l'absence comme « pas de série » :
   rien ne casse pour le primaire.
   NON APPLIQUÉE : accord de JF requis avant exécution (éditeur SQL du tableau de bord, projet RetroActif).
   ORDRE DE MISE EN LIGNE : appliquer cette migration AVANT de créer une tâche de maternelle depuis l'espace enseignant (sinon la création échoue avec un message clair).
   Pas de nouveau grant : la politique « phono taches modification » et les grants existants sur la table couvrent les nouvelles colonnes. */
alter table public.phono_tasks add column if not exists serie_graine integer;
alter table public.phono_tasks add column if not exists serie_nb integer;
alter table public.phono_tasks drop constraint if exists phono_tasks_serie_valeurs;
alter table public.phono_tasks add constraint phono_tasks_serie_valeurs
  check ((serie_graine is null or (serie_graine >= 0 and serie_graine <= 999999999)) and (serie_nb is null or (serie_nb >= 1 and serie_nb <= 20)));
