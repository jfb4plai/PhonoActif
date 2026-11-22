// Ajoute des mots à la base (data/base/fiches.json) à partir d'un fichier de lot, sans repasser par un dossier de pack.
// Une fiche par mot : lettres, cubes, états lettre par lettre (fichiers audio), syllabes, image, phrase d'aide — comme les fiches existantes.
// Les fiches sont créées au statut « brouillon » : publier.js ne sert que les fiches « valide ». Elles passent à « valide » avec `finaliser`,
// une fois TOUS leurs fichiers audio présents (l'audio se génère avec la clé Azure de JF, voir les commandes affichées).
//
// Usage :
//   node tools/base/ajouter_mots.js data/base/lots/<nom>.json              # crée les fiches « brouillon », copie les images, écrit la liste d'audio à générer
//   node tools/base/ajouter_mots.js finaliser <nom> [<dossier-audio>]      # copie l'audio généré dans data/base/assets/audio, passe les fiches à « valide » si tout est là
//
// Fichier de lot : { "nom": "vob-p1", "niveau": "P1", "mots": [ { "mot", "image" (chemin du PNG), "phrase", "commentaire" } ],
//                    "images_existantes": [ { "mot", "image" } ] }   (images à rattacher à des fiches qui existent déjà)
// Sortie à côté : data/packs-atelier/<nom>/ (pack.json, a-generer.json, phrases.json, phrases-a-generer.json) : même format que les anciens packs,
// donc les générateurs d'audio existants (essai-tts-ipa/generer-bibliotheque.py et generer-c2-packs.py) s'utilisent tels quels.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chargerLexique } from '../../src/node/chargerLexique.js';
import { chargerCorrections } from '../../src/node/corrections.js';
import { construirePackLettres, identifiantCarte, composants, SON_VERS_IPA } from '../../src/core/index.js';

const racine = fileURLToPath(new URL('../..', import.meta.url));
const base = path.join(racine, 'data', 'base');
const lire = async f => JSON.parse(await readFile(f, 'utf8'));
const ecrire = (f, d) => writeFile(f, JSON.stringify(d, null, 1) + '\n', 'utf8');
const SOURCE = "Canva (génération d'images par IA, compte éducation), style papier découpé, fond bleu ciel";
const LICENCE = "Image générée par IA (Canva, compte éducation), usage scolaire non commercial";

const fichiersDeFiche = f => [f.image_sans_mot, f.phraseAudio, ...(f.etats || []).map(e => e.fichier), ...(f.syllabes || []).map(s => s.fichier)].filter(Boolean);

async function ajouter(chemin) {
  const lot = await lire(chemin);
  const fiches = await lire(path.join(base, 'fiches.json'));
  const existants = new Map(fiches.map(f => [f.id, f]));
  const lexique = await chargerLexique(path.join(racine, 'data', 'lexique.json'));
  const { corrections } = await chargerCorrections(path.join(racine, 'data', 'corrections.json'));
  const deja = lot.mots.filter(m => existants.has(identifiantCarte(m.mot))).map(m => m.mot);
  const pack = {
    nom: lot.nom, titre: lot.titre || lot.nom, visibilite: 'commun',
    // les fichiers de génération (a-generer, phrases) couvrent TOUT le lot, même les mots déjà ajoutés : on peut relancer l'outil sans perdre la liste d'audio
    // mot sans « image » dans le fichier de lot (mot abstrait, décision de JF) : fiche sans image, comme moi ou pour
    cartes: lot.mots.map(m => ({ mot: m.mot, niveau: m.niveau || lot.niveau, ...(m.image ? { image: `images/${identifiantCarte(m.mot)}.png`, source: SOURCE, licence: LICENCE } : {}), phrase: m.phrase || '' }))
  };
  const r = construirePackLettres({ pack, lexique, corrections });
  const parMot = new Map(lot.mots.map(m => [m.mot, m]));
  await mkdir(path.join(base, 'assets', 'images'), { recursive: true });
  const phrasesAGenerer = [], phrases = {};
  let ajoutees = 0;
  for (const carte of r.manifest.cartes) {
    const m = parMot.get(carte.mot);
    const phraseAudio = carte.phrase ? `audio/phrase-${carte.id}.mp3` : null;
    if (!existants.has(carte.id)) {
      if (m.image) {
        const src = path.resolve(racine, m.image);
        if (!existsSync(src)) throw new Error(`Image introuvable pour « ${carte.mot} » : ${src}`);
        await copyFile(src, path.join(base, 'assets', carte.image_sans_mot));
      }
      const fiche = { ...carte, ...(phraseAudio ? { phraseAudio } : {}), statut: 'brouillon', origine: [lot.nom] };
      delete fiche.aVerifier;
      fiches.push(fiche);
      ajoutees++;
    }
    if (carte.phrase) {
      const ipa = carte.cubes.flatMap(c => composants(c.son)).map(s => SON_VERS_IPA[s]).join('');
      phrases[carte.mot] = carte.phrase;
      phrasesAGenerer.push({ id: carte.id, mot: carte.mot, ipa, phrase: carte.phrase, fichier: phraseAudio });
    }
  }
  const rattachees = [];
  for (const e of lot.images_existantes || []) {
    const f = existants.get(identifiantCarte(e.mot));
    if (!f) { rattachees.push(`${e.mot} : fiche introuvable`); continue; }
    const src = path.resolve(racine, e.image);
    if (!existsSync(src)) throw new Error(`Image introuvable pour « ${e.mot} » : ${src}`);
    f.image_sans_mot = `images/${f.id}.png`; f.source = f.source || SOURCE; f.licence = f.licence || LICENCE;
    await copyFile(src, path.join(base, 'assets', f.image_sans_mot));
    rattachees.push(`${e.mot} : image rattachée`);
  }
  // Phrases d'aide à remplacer sur des fiches existantes (accord phrase-image, règle de JF) : le texte change ici, l'audio se régénère ensuite (clé Azure) puis `finaliser` le remplace.
  const phrasesChangees = [], avertPhrases = [];
  const toutesPhrases = [...lot.mots.filter(m => m.phrase).map(m => ({ mot: m.mot, phrase: m.phrase })), ...(lot.phrases_existantes || [])];
  for (const e of toutesPhrases) {   // le mot cible doit apparaître TEL QUEL dans la phrase (« même », pas « mêmes »)
    const jetons = e.phrase.toLowerCase().replace(/[.,;:!?«»"()]/g, ' ').replace(/[’]/g, "'").split(/[\s']+/).filter(Boolean);
    if (!jetons.includes(e.mot.toLowerCase())) avertPhrases.push(`« ${e.mot} » : absent tel quel de la phrase « ${e.phrase} »`);
  }
  for (const e of lot.phrases_existantes || []) {
    const f = existants.get(identifiantCarte(e.mot));
    if (!f) { rattachees.push(`${e.mot} : fiche introuvable (phrase)`); continue; }
    // pas de « continue » si la phrase est déjà à jour : l'outil reste relançable, la liste des audios à remplacer se reconstruit à chaque passage
    f.phrase = e.phrase; f.phraseAudio = f.phraseAudio || `audio/phrase-${f.id}.mp3`;
    phrasesChangees.push(f.id);
    const ipa = f.cubes.flatMap(c => composants(c.son)).map(s => SON_VERS_IPA[s]).join('');
    phrases[f.mot] = e.phrase;
    phrasesAGenerer.push({ id: f.id, mot: f.mot, ipa, phrase: e.phrase, fichier: f.phraseAudio });
    rattachees.push(`${e.mot} : phrase remplacée`);
  }
  await ecrire(path.join(base, 'fiches.json'), fiches);
  const dossier = path.join(racine, 'data', 'packs-atelier', lot.nom);
  await mkdir(dossier, { recursive: true });
  const manquants = r.fichiersDistincts.filter(f => !existsSync(path.join(base, 'assets', 'audio', f.fichier + '.mp3')));
  await ecrire(path.join(dossier, 'pack.json'), { ...pack, cartes: pack.cartes });
  await ecrire(path.join(dossier, 'a-generer.json'), { nom: lot.nom, fichiersDistincts: r.fichiersDistincts });
  await ecrire(path.join(dossier, 'phrases.json'), phrases);
  await ecrire(path.join(dossier, 'phrases-a-generer.json'), { nom: lot.nom, phrases: phrasesAGenerer });
  await ecrire(path.join(dossier, 'phrases-changees.json'), { ids: phrasesChangees });
  avertPhrases.forEach(a => console.log(`  ATTENTION phrase : ${a}`));
  console.log(`${ajoutees} fiches « brouillon » ajoutées (${deja.length ? 'déjà présentes : ' + deja.length + ' ; ' : ''}${r.exclus.length} écartés).`);
  r.exclus.forEach(e => console.log(`  écarté : ${e.mot} : ${e.raison}`));
  r.avertissements.forEach(a => console.log(`  attention : ${a}`));
  rattachees.forEach(x => console.log(`  ${x}`));
  console.log(`Audio : ${r.fichiersDistincts.length} fichiers distincts dont ${manquants.length} absents de la base ; ${phrasesAGenerer.length} phrases.`);
  const pk = path.join(racine, 'public', 'packs');
  console.log(`Suite (clé Azure, par JF ; les deux commandes écrivent dans ${path.join(pk, lot.nom, 'audio')}) :\n  python -I essai-tts-ipa/generer-bibliotheque.py pack ${lot.nom}\n  python -I essai-tts-ipa/generer-c2-packs.py azure ${lot.nom} --dest ${pk}\n  puis : node tools/base/ajouter_mots.js finaliser ${lot.nom} ${path.join(pk, lot.nom, 'audio')}`);
}

async function finaliser(nom, dossierAudio) {
  const fiches = await lire(path.join(base, 'fiches.json'));
  const mesFiches = fiches.filter(f => (f.origine || []).includes(nom) && f.statut === 'brouillon');
  // audios de phrases REMPLACÉES (fiches existantes dont la phrase a changé) : on écrase l'ancien fichier
  const chChangees = path.join(racine, 'data', 'packs-atelier', nom, 'phrases-changees.json');
  let remplaces = 0;
  const nonRemplaces = [];
  if (existsSync(chChangees) && dossierAudio) {
    for (const id of (await lire(chChangees)).ids) {
      const src = path.join(path.resolve(dossierAudio), `phrase-${id}.mp3`);
      if (existsSync(src)) { await copyFile(src, path.join(base, 'assets', 'audio', `phrase-${id}.mp3`)); remplaces++; } else nonRemplaces.push(id);
    }
    console.log(`${remplaces} audios de phrases remplacés${nonRemplaces.length ? ' ; absents : ' + nonRemplaces.join(', ') : ''}.`);
  }
  if (!mesFiches.length) { console.log(`Aucune fiche « brouillon » pour ${nom}.`); if (remplaces) console.log('Suite : node tools/base/publier.js, puis npx vite build, commit et push.'); return; }
  let copies = 0;
  const manquants = new Set();
  for (const f of mesFiches) {
    for (const fichier of fichiersDeFiche(f).filter(x => x.startsWith('audio/'))) {
      const dest = path.join(base, 'assets', fichier);
      if (existsSync(dest)) continue;
      const src = dossierAudio && path.join(path.resolve(dossierAudio), path.basename(fichier));
      if (src && existsSync(src)) { await mkdir(path.dirname(dest), { recursive: true }); await copyFile(src, dest); copies++; } else manquants.add(`${f.mot} : ${fichier}`);
    }
  }
  const sans = new Set([...manquants].map(x => x.split(' : ')[0]));
  for (const f of mesFiches) if (!sans.has(f.mot)) f.statut = 'valide';
  await ecrire(path.join(base, 'fiches.json'), fiches);
  console.log(`${copies} fichiers audio copiés ; ${mesFiches.filter(f => f.statut === 'valide').length}/${mesFiches.length} fiches passées à « valide ».`);
  manquants.forEach(x => console.log(`  manquant : ${x}`));
  console.log('Suite : node tools/base/publier.js, puis npx vite build, commit et push.');
}

const [a, b, c] = process.argv.slice(2);
if (a === 'finaliser' && b) await finaliser(b, c);
else if (a) await ajouter(path.resolve(a));
else { console.error('Usage : node tools/base/ajouter_mots.js <lot.json> | finaliser <nom> [<dossier-audio>]'); process.exit(2); }
