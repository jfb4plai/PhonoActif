/* Réglage de tâche « consignes vocales » : 'auto' (oui avec les commandes épurées, non sinon), 'voix' (la voix dit les consignes, les encouragements et les aides), 'non'.
   Avant cette migration, ce réglage n'existait que dans le lien rapide. Une tâche enregistrée n'a pas de commandes épurées : 'auto' y signifie « non ».
   Ajout compatible : les tâches existantes reçoivent 'auto' (comportement actuel). phono_lire_tache renvoie aussi `consignes`.
   NON APPLIQUÉE : accord de JF requis avant exécution (éditeur SQL du tableau de bord, projet RetroActif).
   ORDRE DE MISE EN LIGNE : appliquer cette migration AVANT de pousser le code qui lit ou écrit `consignes` (sinon la liste des tâches et la création échouent). */
alter table public.phono_tasks add column if not exists consignes text not null default 'auto';
alter table public.phono_tasks drop constraint if exists phono_tasks_consignes_valeurs;
alter table public.phono_tasks add constraint phono_tasks_consignes_valeurs check (consignes in ('auto', 'voix', 'non'));

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
    'consignes', t.consignes
  );
end;
$$;
