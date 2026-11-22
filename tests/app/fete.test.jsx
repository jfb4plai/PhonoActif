import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fete = readFileSync(join(__dirname, '../../src/app/fete.css'), 'utf8');

describe('fête de réussite', () => {
  it('est coupée quand l\'élève réduit les animations', () => {
    expect(fete).toMatch(/prefers-reduced-motion: reduce\)[^}]*\.zone-juste \.cube \{ animation: none/);
    expect(fete).toMatch(/\.confettis \{ display: none/);
  });
  it('ne se répète pas et ne clignote pas', () => {
    expect(fete).not.toMatch(/infinite/);
  });
});
