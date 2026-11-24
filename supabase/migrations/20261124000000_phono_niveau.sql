/* Réglage de tâche « niveau » : 'primaire' (P1 et plus, construction du mot) ou 'maternelle' (M1 à M3, exercice « première lettre »).
   Avant cette migration, le niveau n'existait que dans le lien rapide (&niveau=maternelle). Les tâches existantes restent 'primaire'.
   phono_lire_tache renvoie aussi `niveau`. Ajout compatible : sans cette migration, le code envoie `niveau` seulement pour une tâche de maternelle,
   lit les tâches avec select('*') et traite l'absence de `niveau` comme « primaire » : rien ne casse pour le primaire.
   NON APPLIQUÉE : accord de JF requis avant exécution (éditeur SQL du tableau de bord, projet RetroActif).
   ORDRE DE MISE EN LIGNE : appliquer cette migration AVANT de donner une tâche de maternelle (sinon la création de cette tâche échoue avec un message clair). */
alter table public.phono_tasks add column if not exists niveau text not null default 'primaire';
alter table public.phono_tasks drop constraint if exists phono_tasks_niveau_valeurs;
alter table public.phono_tasks add constraint phono_tasks_niveau_valeurs check (niveau in ('primaire', 'maternelle'));

create or replace function public.phono_lire_tache(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t public.phono_tasks%rowtype;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{24}$' then
    raise exception 'tache_inconnue';
  end if;
  select * into t from public.phono_tasks where token = p_token and not revoked;
  if not found then
    raise exception 'tache_inconnue';
  end if;
  return jsonb_build_object(
    'pack', t.pack,
    'mode_mot', t.mode_mot,
    'habillage', t.habillage,
    'nb_intrus', t.nb_intrus,
    'exiger_accents', t.exiger_accents,
    'syllabes', t.syllabes,
    'vitesse', t.vitesse,
    'vitesse_verrou', t.vitesse_verrou,
    'mots', to_jsonb(t.mots),
    'consignes', t.consignes,
    'niveau', t.niveau
  );
end;
$$;
