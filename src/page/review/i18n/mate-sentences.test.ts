import { describe, expect, it } from 'vitest';
import { en, english } from './en.ts';
import { fr, french } from './fr.ts';

// The coach's words for a mate: on the board, let in, missed.

describe('a mate on the board', () => {
  it('counts a mate in one in words', () => {
    expect([en.trajectory.mateIn(1), en.trajectory.mateIn(3)]).toEqual([
      'a mate in one',
      'a mate in 3',
    ]);
    expect([fr.trajectory.mateIn(1), fr.trajectory.mateIn(3)]).toEqual([
      'un mat en un',
      'un mat en 3',
    ]);
  });

  it('says who has it, in its moves when sure of them', () => {
    expect(en.trajectory.mates('white', 1)).toContain('Now White has mate in one.');
    expect(english('black').trajectory.mates('black', 3)).toContain('Now you have mate in 3.');
    expect(english('white').trajectory.mates('black', null)).toContain(
      'Now the opponent has a forced mate.',
    );
    expect(fr.trajectory.mates('black', 1)).toContain('Désormais, les Noirs ont un mat en un.');
    expect(french('white').trajectory.mates('white', null)).toContain(
      'Désormais, tu as un mat forcé.',
    );
  });
});

describe('a mate in one', () => {
  it('is said when let in, and when missed', () => {
    const move = '[[m:b:Qh2#]]';
    expect(en.facts.matesNow(move)).toContain(`That allows ${move}, and it’s mate.`);
    expect(fr.facts.matesNow(move)).toContain(`Ça permet ${move}, et c’est mat.`);
    expect(en.facts.mateInOne(move)).toContain(`${move} was mate in one.`);
    expect(fr.facts.mateInOne(move)).toContain(`${move} était mat en un coup.`);
  });
});
