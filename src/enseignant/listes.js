// Listes de mots d'un enseignant (table phono_listes, RLS « created_by = auth.uid() »). Le client Supabase est injecté (testable sans réseau).
// Une liste = 1 à 50 mots (règles dans src/core/liste.js) ; les mêmes bornes sont imposées par la base (migration 20261115000000).
import { validerListe, couper } from '../core/liste.js';

const verifier = ({ error }) => { if (error) throw new Error(error.message); };
const versListe = l => ({ id: l.id, nom: l.name, mots: l.words, maj: l.updated_at });

export async function listerListes(client, userId) {
  const r = await client.from('phono_listes').select('id, name, words, updated_at').eq('created_by', userId);
  verifier(r);
  return r.data.map(versListe).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/* liste = { id?, nom, mots }. options.catalogueIds : Set des identifiants publiés (mot inconnu refusé) ; sans lui, seules les bornes sont contrôlées.
   Toutes les règles sont vérifiées avant tout appel réseau. */
export async function enregistrerListe(client, userId, liste, { catalogueIds } = {}) {
  const nom = typeof liste.nom === 'string' ? liste.nom.trim() : '';
  const nbCar = Array.from(nom).length; // caractères, comme char_length de la base (un émoji = 1)
  if (nbCar < 1 || nbCar > 60) throw new Error('Le nom de la liste doit faire de 1 à 60 caractères.');
  const { erreurs, mots } = validerListe(liste.mots, catalogueIds || new Set(Array.isArray(liste.mots) ? liste.mots : []));
  if (erreurs.length) throw new Error(erreurs[0]);
  const maintenant = new Date().toISOString();
  const r = liste.id
    ? await client.from('phono_listes').update({ name: nom, words: mots, updated_at: maintenant }).eq('id', liste.id).eq('created_by', userId).select('id, name, words, updated_at').single()
    : await client.from('phono_listes').insert({ created_by: userId, name: nom, words: mots }).select('id, name, words, updated_at').single();
  verifier(r);
  return versListe(r.data);
}

export function dupliquerListe(client, userId, liste, options) {
  const suffixe = ' (copie)';
  const nom = couper(liste.nom, 60 - suffixe.length) + suffixe;
  return enregistrerListe(client, userId, { nom, mots: liste.mots }, options);
}

export async function supprimerListe(client, id) {
  verifier(await client.from('phono_listes').delete().eq('id', id));
}
