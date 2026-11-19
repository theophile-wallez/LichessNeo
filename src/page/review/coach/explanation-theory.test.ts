import { beforeAll, describe, expect, it } from 'vitest';
import { AFTER_E4, AFTER_E5, takeTestTheory, theoryMove } from '#page/review/fixtures/theory.ts';
import { en } from '#page/review/i18n/en.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { PlayersAt } from '#page/review/theory/players.ts';
import { explanation } from './explanation.ts';
import { NO_THREATS } from './threat-facts.ts';

// The coach's comment where the opening's theory has its say.

beforeAll(takeTestTheory);

const CONTEXT = { gameId: 'abcdefgh', coach: 1, language: en };

const said = (move: MoveVerdict, players: PlayersAt | null = null): string[] =>
  explanation(move, CONTEXT, {
    opening: '',
    threats: NO_THREATS,
    turning: false,
    recent: new Set(),
    players,
  }).map(part => part.text);

/** Of 1000 games, `f6` or `Qh5` in 100: an error one player in ten makes there. */
const players = (san: 'f6' | 'Qh5', uci: string): PlayersAt => ({
  data: {
    white: 1000,
    draws: 0,
    black: 0,
    moves: [{ uci, san, white: 100, draws: 0, black: 0 }],
  },
  rated: true,
});

describe('explanation, in the opening', () => {
  it('explains the theory of the position a move reaches, in place of the judged comment', () => {
    const parts = said(theoryMove({ fen: AFTER_E4, uci: 'e7e5', ply: 2, book: true }));
    expect(parts[0]).toBe('The open game, [[m:w:Nf3@a:g1f3]] first.');
  });

  it('puts how common a known mistake is before why it’s one', () => {
    const parts = said(
      theoryMove({ fen: AFTER_E4, uci: 'f7f6', ply: 2, loss: 20 }),
      players('f6', 'f7f6'),
    );
    expect(parts[0]).toMatch(/10%/);
    expect(parts[1]).toBe('It weakens the king: [[m:w:Qh5+@a:d1h5]].');
  });

  it('leads the judged comment on a move out of theory with what theory plays', () => {
    const parts = said(
      theoryMove({ fen: AFTER_E5, uci: 'd1h5', ply: 3, loss: 20 }),
      players('Qh5', 'd1h5'),
    );
    expect(parts[0]).toMatch(/\[\[m:w:Nf3@b:g1f3\]\]/);
    expect(parts[1]).toMatch(/10%/);
    expect(parts.length).toBeGreaterThan(2);
  });
});
