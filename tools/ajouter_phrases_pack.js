// Ajoute les phrases d'aide (écrites par l'enseignant) à un pack « lettres » déjà fabriqué.
// Usage : node tools/ajouter_phrases_pack.js <pack> [--tout]
//  lit data/packs-atelier/<pack>/phrases.json ({ mot: phrase }, produit par python -I tools/phrases_pack_xlsx.py lire …) ;
//  écrit data/packs-atelier/<pack>/phrases-a-generer.json (phrase, IPA du mot, fichier) pour la voix ;
//  ajoute au manifeste phrase (texte, jamais affiché) et phraseAudio seulement si le fichier audio existe déjà dans public/packs/<pack>/audio
//  (sinon le bouton jouerait un fichier absent). --tout : ajoute phraseAudio même sans fichier (à n'utiliser qu'après génération).
// Suite : python -I essai-tts-ipa/generer-bibliotheque.py phrases <pack>   (clé Azure, par JF), puis relancer cet outil.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { composants, SON_VERS_IPA, identifiantCarte } from '../src/core/index.js';

export async function ajouterPhrases({ racine, pack, tout = false }) {
  const dossierPack = path.join(racine, 'public', 'packs', pack);
  const chManifest = path.join(dossierPack, 'manifest.json');
  const manifest = JSON.parse(await readFile(chManifest, 'utf8'));
  const phrases = JSON.parse(await readFile(path.join(racine, 'data', 'packs-atelier', pack, 'phrases.json'), 'utf8'));
  const aGenerer = [], ajoutes = [], attente = [], inconnus = [];
  const mots = new Set(manifest.cartes.map(c => c.mot));
  for (const m of Object.keys(phrases)) if (!mots.has(m)) inconnus.push(m);
  for (const c of manifest.cartes) {
    const phrase = phrases[c.mot];
    if (!phrase) continue;
    const id = identifiantCarte(c.mot);
    const fichier = `audio/phrase-${id}.mp3`;
    const ipa = c.cubes.flatMap(x => composants(x.son)).map(s => SON_VERS_IPA[s]).join('');
    aGenerer.push({ id, mot: c.mot, ipa, phrase, fichier });
    c.phrase = phrase;
    if (tout || existsSync(path.join(dossierPack, fichier))) { c.phraseAudio = fichier; ajoutes.push(c.mot); }
    else { delete c.phraseAudio; attente.push(c.mot); }
  }
  await mkdir(path.join(racine, 'data', 'packs-atelier', pack), { recursive: true });
  await writeFile(path.join(racine, 'data', 'packs-atelier', pack, 'phrases-a-generer.json'), JSON.stringify({ nom: pack, phrases: aGenerer }, null, 1) + '\n', 'utf8');
  await writeFile(chManifest, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
  return { ajoutes, attente, inconnus, total: aGenerer.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pack = process.argv[2];
  if (!pack || pack.startsWith('--')) { console.error('Usage : node tools/ajouter_phrases_pack.js <pack> [--tout]'); process.exit(2); }
  const racine = fileURLToPath(new URL('..', import.meta.url));
  const r = await ajouterPhrases({ racine, pack, tout: process.argv.includes('--tout') });
  console.log(`${r.total} phrase(s) ; ${r.ajoutes.length} avec audio dans le manifeste ; ${r.attente.length} en attente de l'audio.`);
  if (r.inconnus.length) console.log(`mots absents du pack (ignorés) : ${r.inconnus.join(', ')}`);
  if (r.attente.length) console.log(`Suite : python -I essai-tts-ipa/generer-bibliotheque.py phrases ${pack}   (clé Azure), puis : node tools/ajouter_phrases_pack.js ${pack}`);
}
