import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fete = readFileSync(join(__dirname, '../../src/app/fete.css'), 'utf8');

describe('fête de réussite', () => {
  it('est coupée quand l\'élève réduit les animations', () => {
    expect(fete).toMatch(/prefers-reduced-motion: reduce\)[^\n]*\.zone-juste \.cube[^\n]*animation: none/);
    expect(fete).toMatch(/\.confettis \{ display: none/);
  });
  it('ne se répète pas et ne clignote pas', () => {
    expect(fete).not.toMatch(/infinite/);
  });
});

describe('quatre fêtes + bilan', () => {
  it('définit les fêtes 1 à 3 et celle du bilan, toutes avec une durée finie', () => {
    for (const n of ['tourne', 'pop', 'balance', 'monte', 'tombe', 'tombe-bilan']) expect(fete).toContain(`@keyframes ${n}`);
    expect(fete).not.toMatch(/infinite/);
  });
  it('le bilan est aussi coupé si les animations sont réduites', () => {
    expect(fete).toMatch(/prefers-reduced-motion: reduce\)[^\n]*\.bilan h1 \{ animation: none/);
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import Bilan from '../../src/app/Bilan.jsx';
describe('bilan', () => {
  it('affiche la fête décorative sans gêner la lecture', () => {
    const { container } = render(<Bilan nbCartes={20} onRejouer={() => {}} onAccueil={() => {}} />);
    const f = container.querySelector('.confettis');
    expect(f).not.toBeNull();
    expect(f.getAttribute('aria-hidden')).toBe('true');
    expect(f.querySelectorAll('.conf').length).toBe(30);
    expect(screen.getByText('Pack terminé')).toBeInTheDocument();
  });
});
