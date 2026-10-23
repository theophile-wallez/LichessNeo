import { describe, expect, it } from 'vitest';
import { practiceEn } from './en-practice.ts';
import { practiceFr } from './fr-practice.ts';
import { en } from './en.ts';
import { fr } from './fr.ts';
import type { BookSource } from './practice-types.ts';

const MASTERS: BookSource = { db: 'masters' };
const YOURS: BookSource = { db: 'player', player: 'alice', you: true };
const BOBS: BookSource = { db: 'player', player: 'Bob', you: false };

/** The strings' shape: each key's kind, an object's own shape, down to the leaves. */
function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return 'ways';
  if (typeof value === 'object' && value !== null)
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'ideas')
        .map(([key, member]) => [key, shapeOf(member)]),
    );
  return typeof value;
}

/** Every constant text in the strings, by its path. */
function texts(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, member]) => texts(member, `${path}.${key}`));
}

describe('the practice strings', () => {
  it('are reached through each language', () => {
    expect(en.ui.practice).toBe(practiceEn);
    expect(fr.ui.practice).toBe(practiceFr);
  });

  it('have the same shape in both languages', () => {
    expect(shapeOf(practiceFr)).toEqual(shapeOf(practiceEn));
  });

  it('have no empty text, and a move in every title that names one', () => {
    for (const strings of [practiceEn, practiceFr]) {
      const empty = texts(strings).filter(([, text]) => text.trim() === '');
      expect(empty).toEqual([]);
      const titles = [
        strings.outTitle,
        strings.dubiousTitle,
        strings.revealedTitle,
        ...Object.values(strings.kinds),
      ];
      for (const title of [...titles, strings.modes.deviatedTitle, strings.modes.revealedTitle])
        expect(title).toContain('{m}');
    }
  });
});

describe('a move’s games', () => {
  it('count the games where few reached the position, else give a share', () => {
    expect(practiceEn.share(MASTERS, { games: 2, of: 3 })).toEqual([
      'Seen in 2 of 3 master games.',
    ]);
    expect(practiceEn.share(YOURS, { games: 1, of: 1 })).toEqual(['Seen in your only game.']);
    expect(practiceEn.share(BOBS, { games: 450, of: 1000 })[0]).toBe(
      '45% of Bob’s games go this way.',
    );
    expect(practiceFr.share(MASTERS, { games: 2, of: 3 })[0]).toContain(
      '2 des 3 parties de maîtres',
    );
    expect(practiceFr.share(YOURS, { games: 1, of: 1 })[0]).toContain('ta seule partie');
    expect(practiceFr.mainIs('e4', { games: 450, of: 1000 })[0]).toMatch(/45\s%/);
  });

  it('write a rare move’s share finely, not as none', () => {
    expect(practiceEn.page.share(0.004)).toBe('0.4%');
    expect(practiceEn.page.share(0.45)).toBe('45%');
    expect(practiceFr.page.share(0.004)).toMatch(/^0,4\s%$/);
    expect(practiceEn.missedRare(MASTERS, 'a3', { games: 4, of: 1000 })[0]).toBe(
      'a3 is a rare one (0.4%).',
    );
  });

  it('say whose games played a move, or none', () => {
    expect(practiceEn.missedOut(BOBS, 'h4')).toEqual(['Bob never plays h4 here.']);
    expect(practiceEn.missedOut(YOURS, 'h4')[0]).toBe('You’ve never played h4 here.');
    expect(practiceEn.findBook(MASTERS)[0]).toBe('Find the move the masters play!');
    expect(practiceFr.missedOut(BOBS, 'h4').join(' ')).toContain('Bob');
  });
});

describe('the line’s tally', () => {
  it('counts the book moves and the main ones', () => {
    expect(practiceEn.tally(1, 1)).toBe('The main move. Nice!');
    expect(practiceEn.tally(3, 3)).toBe('3 book moves, all main ones.');
    expect(practiceEn.tally(2, 0)).toBe('2 book moves, off the beaten track.');
    expect(practiceEn.tally(4, 1)).toBe('4 book moves, 1 of them main ones.');
    expect(new Set([1, 3, 4].map(main => practiceFr.tally(4, main))).size).toBe(3);
  });

  it('counts the moves taken back', () => {
    expect(practiceEn.missesTally(1)[0]).toBe('One move taken back.');
    expect(practiceEn.missesTally(3)[0]).toBe('3 moves taken back.');
    expect(practiceFr.missesTally(3).join(' ')).toContain('3');
  });
});
