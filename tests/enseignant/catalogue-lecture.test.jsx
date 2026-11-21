import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Catalogue from '../../src/enseignant/Catalogue.jsx';

afterEach(cleanup);
const E = (id, mot, reguliere) => ({ id, mot, nbSyllabes: 1, cubes: [mot], image: false, phrase: false, lecture: { reguliere, raisons: reguliere ? [] : ['« t » ne se lit pas'] } });
const CAT = [E('papa', 'papa', true), E('chat', 'chat', false), E('ami', 'ami', true)];

describe('catalogue : lecture du mot', () => {
  it('filtre « à mémoriser » et « lettre par lettre »', async () => {
    render(<Catalogue catalogue={CAT} choisis={new Set()} onBasculer={() => {}} onEcouter={() => {}} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    await userEvent.selectOptions(screen.getByLabelText('Lecture du mot'), 'irreguliere');
    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual([expect.stringContaining('chat')]);
    await userEvent.selectOptions(screen.getByLabelText('Lecture du mot'), 'reguliere');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
  it('sans données de lecture (fiches absentes) : pas de filtre proposé', () => {
    render(<Catalogue catalogue={CAT.map(({ lecture, ...e }) => e)} choisis={new Set()} onBasculer={() => {}} onEcouter={() => {}} />);
    expect(screen.queryByLabelText('Lecture du mot')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
