// Usage : node tools/pack_demo.js
// Écrit public/packs/demo/ : manifest.json (6 cartes, cubes issus du lexique réel) et deux images SVG provisoires par carte
// (<id>.svg sans le mot, <id>-mot.svg avec le mot en Arial). Mots choisis parce que leurs sons ont déjà un fichier.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chargerLexique } from '../src/node/chargerLexique.js';
import { preparerPack } from '../src/core/index.js';

const DESSINS = {
  chat: `<polygon points="52,78 56,28 92,60" fill="#f6b26b" stroke="#2b2b2b" stroke-width="5" stroke-linejoin="round"/><polygon points="148,78 144,28 108,60" fill="#f6b26b" stroke="#2b2b2b" stroke-width="5" stroke-linejoin="round"/><circle cx="100" cy="102" r="52" fill="#f6b26b" stroke="#2b2b2b" stroke-width="5"/><circle cx="82" cy="96" r="6" fill="#2b2b2b"/><circle cx="118" cy="96" r="6" fill="#2b2b2b"/><polygon points="92,112 108,112 100,122" fill="#f08a9b"/><path d="M100 122 Q90 134 80 128 M100 122 Q110 134 120 128" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/>`,
  lune: `<circle cx="100" cy="100" r="62" fill="#ffd54f" stroke="#2b2b2b" stroke-width="5"/><circle cx="128" cy="86" r="52" fill="#e3f2fd"/><circle cx="60" cy="52" r="5" fill="#ffd54f"/><circle cx="154" cy="150" r="4" fill="#ffd54f"/>`,
  pain: `<rect x="30" y="76" width="140" height="56" rx="28" fill="#e0a860" stroke="#2b2b2b" stroke-width="5"/><path d="M62 82 L76 126 M96 80 L110 128 M130 82 L144 126" stroke="#b9792f" stroke-width="6" stroke-linecap="round"/>`,
  maman: `<circle cx="100" cy="60" r="28" fill="#ffcc99" stroke="#2b2b2b" stroke-width="5"/><path d="M72 56 Q100 20 128 56 Q112 40 100 44 Q88 40 72 56Z" fill="#8d5524"/><path d="M70 170 L84 98 L116 98 L130 170Z" fill="#ef6c57" stroke="#2b2b2b" stroke-width="5" stroke-linejoin="round"/><path d="M100 140 C88 128 88 116 100 120 C112 116 112 128 100 140Z" fill="#fff"/>`,
  vache: `<rect x="40" y="72" width="104" height="60" rx="14" fill="#fff" stroke="#2b2b2b" stroke-width="5"/><rect x="132" y="56" width="40" height="44" rx="12" fill="#fff" stroke="#2b2b2b" stroke-width="5"/><circle cx="160" cy="76" r="4" fill="#2b2b2b"/><rect x="156" y="88" width="16" height="10" rx="5" fill="#f4a7b9"/><ellipse cx="66" cy="92" rx="14" ry="10" fill="#2b2b2b"/><ellipse cx="108" cy="110" rx="12" ry="9" fill="#2b2b2b"/><path d="M52 132 V164 M72 132 V164 M112 132 V164 M132 132 V164" stroke="#2b2b2b" stroke-width="6" stroke-linecap="round"/>`,
  sac: `<path d="M56 76 H144 L156 164 H44 Z" fill="#5d89d9" stroke="#2b2b2b" stroke-width="5" stroke-linejoin="round"/><path d="M78 76 C78 40 122 40 122 76" fill="none" stroke="#2b2b2b" stroke-width="6" stroke-linecap="round"/><rect x="82" y="108" width="36" height="22" rx="4" fill="#fff" opacity=".85"/>`
};

const svg = (corps, mot) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 ${mot ? 236 : 200}" width="200" height="${mot ? 236 : 200}"><rect x="2" y="2" width="196" height="${mot ? 232 : 196}" rx="22" fill="#fffdf4" stroke="#ef6c57" stroke-width="4"/>${corps}${mot ? `<text x="100" y="222" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="bold" fill="#2b2b2b">${mot}</text>` : ''}</svg>\n`;

const racine = fileURLToPath(new URL('..', import.meta.url));
const lexique = await chargerLexique(path.join(racine, 'data', 'lexique.json'));
const mots = Object.keys(DESSINS);
const { manifest } = preparerPack({ nom: 'demo', mots, source: "pack d'essai, dessins provisoires", licence: 'propre', lexique });
for (const c of manifest.cartes) { c.image_sans_mot = `${c.id}.svg`; c.image_avec_mot = `${c.id}-mot.svg`; }

const dossier = path.join(racine, 'public', 'packs', 'demo');
await mkdir(dossier, { recursive: true });
await writeFile(path.join(dossier, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n', 'utf8');
for (const c of manifest.cartes) {
  await writeFile(path.join(dossier, c.image_sans_mot), svg(DESSINS[c.mot]), 'utf8');
  await writeFile(path.join(dossier, c.image_avec_mot), svg(DESSINS[c.mot], c.mot), 'utf8');
}
console.log(`${manifest.cartes.length} cartes dans ${dossier} (à vérifier : ${manifest.cartes.filter(c => c.aVerifier).length})`);
