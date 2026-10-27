import { describe, expect, it } from 'vitest';
import { recentGames } from './games.ts';

// Games as Lichess's export writes them, one a line, cut to what the section reads.
const FEN = 'r6r/p1Q1bkpp/4pp2/5P2/1p6/2P5/PP1P2PP/nNB1qBK1 w - - 0 1';

const ERESY = { user: { name: 'Eresy', id: 'eresy' }, rating: 1429, ratingDiff: 7 };

const exported = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    id: 'aDN8u0zd',
    speed: 'bullet',
    lastMoveAt: 1_792_614_257_022,
    status: 'resign',
    players: {
      white: { user: { name: 'Chlodowech', id: 'chlodowech', title: 'FM' }, rating: 1508 },
      black: ERESY,
    },
    winner: 'black',
    clock: { initial: 120, increment: 1, totalTime: 160 },
    lastFen: FEN,
    lastMove: 'c2a1',
    ...overrides,
  });

describe('the profile’s recent games', () => {
  it('reads a game from the player’s side: their board, their opponent, their outcome', () => {
    expect(recentGames(exported(), 'Eresy')).toEqual([
      {
        href: '/game/aDN8u0zd/black',
        board: { fen: FEN, orientation: 'black', lastMove: ['c2', 'a1'] },
        opponent: { name: 'Chlodowech', title: 'FM', rating: 1508, aiLevel: undefined },
        outcome: 'win',
        ratingDiff: 7,
        speed: 'bullet',
        clock: { initial: 120, increment: 1 },
        daysPerTurn: undefined,
        playedAt: 1_792_614_257_022,
      },
    ]);
  });

  it('tells a loss and a draw from a win, and links White’s game without a side', () => {
    const asWhite = { white: ERESY, black: { aiLevel: 5 } };
    const [loss, draw] = recentGames(
      [
        exported({ players: asWhite }),
        exported({ players: asWhite, winner: undefined, status: 'draw' }),
      ].join('\n'),
      'Eresy',
    );
    expect(loss?.outcome).toBe('loss');
    expect(loss?.href).toBe('/game/aDN8u0zd');
    expect(loss?.board.orientation).toBe('white');
    expect(loss?.opponent).toEqual({
      name: undefined,
      title: undefined,
      rating: undefined,
      aiLevel: 5,
    });
    expect(draw?.outcome).toBe('draw');
  });

  it('leaves out games never played, others’ games and lines that aren’t a game', () => {
    const lines = [
      exported({ status: 'aborted' }),
      exported({ status: 'noStart' }),
      exported({ players: { white: { aiLevel: 3 }, black: { aiLevel: 4 } } }),
      '{"error":"Not found"}',
      '',
      exported({ id: 'Kl2X7vcs' }),
    ];
    expect(recentGames(lines.join('\n'), 'Eresy').map(game => game.href)).toEqual([
      '/game/Kl2X7vcs/black',
    ]);
  });

  it('keeps the five newest', () => {
    const lines = Array.from({ length: 8 }, (_, i) => exported({ id: `game000${i}` }));
    expect(recentGames(lines.join('\n'), 'Eresy').map(game => game.href)).toEqual([
      '/game/game0000/black',
      '/game/game0001/black',
      '/game/game0002/black',
      '/game/game0003/black',
      '/game/game0004/black',
    ]);
  });
});
