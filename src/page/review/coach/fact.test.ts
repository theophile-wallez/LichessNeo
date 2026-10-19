import { describe, expect, it } from 'vitest';
import type { Piece } from '#shared/chess/index.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { en, english } from '#page/review/i18n/en.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { findings } from './fact.ts';
import { NO_THREATS, type Threats } from './threat-facts.ts';
import { passedFen } from './threat.ts';

// What the coach finds to say of a move: a trade, the better move and what it
// did, the error a miss let go, and the opponent's threat before its capture.

// The moves' chips play their line on the board; the sentences are read without.
const PLAY = /@[ab]:[^\]]*/g;

const record = (whiteWinChance: number, line: readonly string[] = []): PositionRecord => ({
  cp: Math.round((whiteWinChance - 50) * 20),
  whiteWinChance,
  secondLineWinChance: null,
  best: line[0] ?? null,
  line: [...line],
});

interface Played {
  readonly from: string;
  readonly uci: string;
  readonly san: string;
  readonly to: string;
  readonly before: PositionRecord;
  readonly after: PositionRecord;
  readonly ply?: number;
  readonly previousMove?: MoveVerdict;
}

const verdict = ({ from, uci, san, to, before, after, ply = 30, previousMove }: Played) =>
  judge({
    previousPosition: { ply: ply - 1, fen: from },
    position: { ply, fen: to, uci, san },
    before,
    after,
    book: false,
    chess960: false,
    ...(previousMove ? { previousMove } : {}),
  });

const factOf = (move: MoveVerdict, threats: Threats = NO_THREATS, language = en) =>
  findings(move, language, threats).fact;

const textOf = (move: MoveVerdict, threats?: Threats, language = en) =>
  factOf(move, threats, language)?.text.replace(PLAY, '') ?? null;

const black = (role: Piece['role']): Piece => ({ role, color: 'black' });

/** White's Nxd6, at a knight the c7 pawn defends. */
const trade = (from: string, to: string) =>
  verdict({
    from,
    uci: 'e4d6',
    san: 'Nxd6',
    to,
    before: record(50, ['e4d6']),
    after: record(50, ['c7d6']),
  });

describe('a capture', () => {
  it('is a trade, which a side ahead in material is glad of', () => {
    const even = trade('7k/2p5/3n4/8/4N3/8/8/4K3 w - - 0 1', '7k/2p5/3N4/8/8/8/8/4K3 b - - 0 1');
    expect(en.facts.trades(black('knight'), false)).toContain(textOf(even));
    const ahead = trade('7k/2p5/3n4/8/4N3/8/8/R3K3 w - - 0 1', '7k/2p5/3N4/8/8/8/8/R3K3 b - - 0 1');
    expect(en.facts.trades(black('knight'), true)).toContain(textOf(ahead));
  });
});

describe('the better move', () => {
  it('says what it did', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const move = verdict({
      from: start,
      uci: 'a2a3',
      san: 'a3',
      to: 'rnbqkbnr/pppppppp/8/8/8/P7/1PPPPPPP/RNBQKBNR b KQkq - 0 1',
      before: record(52, ['g1f3']),
      after: record(45, ['e7e5']),
      ply: 1,
    });
    expect(move.moveClass).toBe('inaccuracy');
    expect(textOf(move)).toMatch(/Nf3\]\].*developing the \[\[p:wn\]\]knight/);
  });
});

describe('a miss', () => {
  // White's king walks into a knight's fork of it and the rook, and Black lets it go.
  const blunder = verdict({
    from: '7k/8/8/8/3n4/8/5K1P/R7 w - - 0 30',
    uci: 'f2e1',
    san: 'Ke1',
    to: '7k/8/8/8/3n4/8/7P/R3K3 b - - 1 30',
    before: record(85, ['f2g3', 'h8g8', 'h2h4', 'g8f7']),
    after: record(15, ['d4c2', 'e1d2', 'c2a1', 'h2h3', 'h8g8']),
  });
  const miss = verdict({
    from: '7k/8/8/8/3n4/8/7P/R3K3 b - - 1 30',
    uci: 'h8g8',
    san: 'Kg8',
    to: '6k1/8/8/8/3n4/8/7P/R3K3 w - - 2 31',
    before: record(15, ['d4c2', 'e1d2', 'c2a1', 'h2h3', 'h8g8']),
    after: record(50, ['e1d1', 'g8f7', 'h2h4', 'f7e6']),
    ply: 31,
    previousMove: blunder,
  });

  it('says how the error it let go was punished', () => {
    expect([blunder.moveClass, miss.moveClass]).toEqual(['blunder', 'miss']);
    expect(textOf(miss)).toMatch(/forking the \[\[p:wk\]\]king and the \[\[p:wr\]\]rook/);
    expect(factOf(miss)?.theme).toBe('fork');
  });
});

describe('the opponent’s move', () => {
  // The bishop takes the loose pawn on d2, and aims at the loose knight on b4 from there.
  const takes = verdict({
    from: '6k1/5ppp/8/8/1n6/8/3p1PPP/2B3K1 w - - 0 1',
    uci: 'c1d2',
    san: 'Bxd2',
    to: '6k1/5ppp/8/8/1n6/8/3B1PPP/6K1 b - - 0 1',
    before: record(50, ['c1d2']),
    after: record(50, ['b4c6', 'g1f1']),
  });
  const passed = passedFen(takes.position.fen) ?? '';
  const threats: Threats = {
    before: null,
    after: { fen: passed, record: { ...record(65, ['d2b4', 'g8f8', 'g1f1']), cp: 300 } },
  };

  it('is read for its threat before its capture', () => {
    expect(en.facts.winsForFree(black('pawn'))).toContain(textOf(takes, threats, english('white')));
    expect(textOf(takes, threats, english('black'))).toMatch(/Bxb4/);
  });
});
