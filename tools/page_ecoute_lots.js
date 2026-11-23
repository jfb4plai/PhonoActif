// Page d'écoute des mots des lots du pack progressif (image, mot, phrase, syllabes, états lettre par lettre).
// Usage : node tools/page_ecoute_lots.js 19 20 22  ->  docs/ecoute-lots-19-20-22.html (s'ouvre en file://, chemins relatifs vers public/mots/)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lots = process.argv.slice(2).filter(x => /^\d+$/.test(x));
if (lots.length === 0) { console.error('Usage : node tools/page_ecoute_lots.js 19 20 22'); process.exit(1); }
const fiches = JSON.parse(await readFile(path.join(racine, 'data', 'base', 'fiches.json'), 'utf8'));
const parMot = new Map(fiches.map(f => [f.mot, f]));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const A = f => `../public/mots/${f}`;

let corps = '';
for (const n of lots) {
  const lot = JSON.parse(await readFile(path.join(racine, 'data', 'base', 'lots', `pack-progressif-p1-lot${n}.json`), 'utf8'));
  corps += `<h2>Lot ${n}</h2><div class="grille">`;
  for (const m of lot.mots) {
    const f = parMot.get(m.mot);
    if (!f) { corps += `<section class="mot"><h3>${esc(m.mot)}</h3><p class="absent">absent de la base</p></section>`; continue; }
    const final = f.etats && f.etats.length ? f.etats[f.etats.length - 1].fichier : '';
    const btn = (fichier, texte) => (fichier ? `<button type="button" data-a="${esc(A(fichier))}">${esc(texte)}</button>` : '');
    const etats = (f.etats || []).map(e => btn(e.fichier, e.lettres)).join('');
    const syl = (f.syllabes || []).map((s, i) => btn(s.fichier, `${i + 1}. ${s.ipa}`)).join('');
    corps += `<section class="mot">
      ${f.image_sans_mot ? `<img src="${esc(A(f.image_sans_mot))}" alt="${esc(f.mot)}" width="160" height="160">` : '<div class="sans-image">sans image</div>'}
      <h3>${esc(f.mot)}</h3>
      <div class="rang">${btn(final, 'Mot')}${btn(f.phraseAudio, 'Phrase')}</div>
      <p class="phrase">${esc(f.phrase || '')}</p>
      ${syl ? `<p class="titre">Syllabes</p><div class="rang">${syl}</div>` : ''}
      ${etats ? `<p class="titre">Lettre par lettre</p><div class="rang">${etats}</div>` : ''}
    </section>`;
  }
  corps += '</div>';
}

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Écoute des lots ${lots.join(', ')} du pack progressif</title>
<style>
body{font:18px/1.4 Arial,sans-serif;margin:1rem;background:#faf9f7;color:#222}
h1{font-size:1.4rem} h2{margin-top:2rem;color:#0f6e56}
.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem}
.mot{background:#fff;border:1px solid #ddd;border-radius:8px;padding:.75rem}
.mot h3{margin:.25rem 0;font-size:1.3rem}
.mot img{display:block;border-radius:6px}
.sans-image{width:160px;height:160px;display:flex;align-items:center;justify-content:center;background:#eee;color:#666}
.rang{display:flex;flex-wrap:wrap;gap:.4rem}
button{min-height:44px;min-width:44px;font-size:1rem;padding:.4rem .8rem;border:1px solid #0f6e56;background:#fff;border-radius:6px;cursor:pointer}
button.joue{background:#0f6e56;color:#fff}
.titre{margin:.5rem 0 .2rem;font-size:.9rem;color:#555}
.phrase{margin:.4rem 0;font-style:italic}.absent{color:#b91c1c}
</style></head><body>
<h1>Écoute des lots ${lots.join(', ')} du pack progressif</h1>
<p>« Mot » et « Phrase » : voix Azure Charline. « Lettre par lettre » : l'enfant entend le mot se construire (t, to, tom…). Fichiers lus depuis <code>public/mots/</code>.</p>
${corps}
<script>
const lecteur = new Audio();
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  document.querySelectorAll('button.joue').forEach(x => x.classList.remove('joue'));
  b.classList.add('joue'); lecteur.src = b.dataset.a; lecteur.play().catch(() => {});
});
lecteur.addEventListener('ended', () => document.querySelectorAll('button.joue').forEach(x => x.classList.remove('joue')));
</script></body></html>
`;
const sortie = path.join(racine, 'docs', `ecoute-lots-${lots.join('-')}.html`);
await writeFile(sortie, html, 'utf8');
console.log(`Écrit : ${sortie}`);
