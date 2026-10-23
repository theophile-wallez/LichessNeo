import { describe, expect, it } from 'vitest';
import { entry } from '#page/review/fixtures/practice.ts';
import { blitzCards, cardTree } from './blitz.ts';
import { OPENINGS } from './openings.ts';
import { writeMovetext } from './pgn-tree.ts';

/** Ever larger rolls: the cards keep the order they were made in. */
const inOrder = (): (() => number) => {
  let roll = 0;
  return () => roll++;
};

/** Ever smaller rolls: the cards come in the reverse order. */
const backwards = (): (() => number) => {
  let roll = 0;
  return () => roll--;
};

describe('blitzCards', () => {
  it('asks for each opening’s last move, from the position before it', () => {
    const cards = blitzCards([], inOrder());
    expect(cards[0]).toMatchObject({
      side: 'white',
      moves: ['e4', 'e5', 'Nf3', 'Nc6'],
      name: 'Italian Game',
    });
    expect(cards[0]?.answers).toContain('Bc4');
    const unasked = OPENINGS.filter(opening => {
      const card = cards.find(
        each =>
          each.side === opening.side &&
          each.name === opening.name &&
          each.moves.join(' ') === opening.moves.slice(0, -1).join(' '),
      );
      return card?.answers.join() !== opening.moves.at(-1);
    });
    expect(unasked.map(opening => opening.name)).toEqual([]);
  });

  it('adds the user’s positions with a name, their moves found counting', () => {
    const entries = [
      entry({ moves: ['e4', 'e6', 'd4', 'd5'], answers: ['e5', 'Nc3'], name: 'French Defense' }),
      entry({ moves: ['e4', 'e5', 'Nf3', 'Nc6'], answers: ['d4'], name: 'Scotch Game' }),
      entry({ moves: ['e4'], answers: [], name: 'King’s Pawn' }),
      entry({ moves: ['c4'], answers: ['e5'], name: '' }),
    ];
    const cards = blitzCards(entries, inOrder());
    expect(cards.find(card => card.moves.join(' ') === 'e4 e6 d4 d5')).toEqual({
      side: 'white',
      moves: ['e4', 'e6', 'd4', 'd5'],
      answers: ['e5', 'Nc3'],
      name: 'French Defense',
    });
    const fromKnights = cards.filter(card => card.moves.join(' ') === 'e4 e5 Nf3 Nc6');
    expect(fromKnights.find(card => card.name === 'Italian Game')?.answers).toEqual(['Bc4']);
    expect(fromKnights.find(card => card.name === 'Scotch Game')?.answers).toEqual(['d4']);
    expect(cards.some(card => card.moves.join(' ') === 'e4' && card.side === 'white')).toBe(false);
    expect(cards.some(card => card.moves.join(' ') === 'c4')).toBe(false);
  });

  it('shuffles the cards, at most 80', () => {
    const entries = Array.from({ length: 100 }, (_, i) =>
      entry({ moves: [`m${i}`], answers: ['e4'], name: 'Mine' }),
    );
    expect(blitzCards(entries, inOrder())).toHaveLength(80);
    const reversed = blitzCards([], backwards());
    expect(reversed.at(-1)?.name).toBe('Italian Game');
  });
});

describe('cardTree', () => {
  it('is the card’s moves, then each answer from its position', () => {
    expect(writeMovetext(cardTree(['e4', 'e5'], ['Nf3', 'Bc4']))).toBe(
      '1. e4 e5 2. Nf3 (2. Bc4) *',
    );
    expect(writeMovetext(cardTree([], ['d4']))).toBe('1. d4 *');
  });
});
