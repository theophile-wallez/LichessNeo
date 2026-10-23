import { Analysis } from '#page/lichess/analysis.ts';
import type { ExplorerData } from '#page/lichess/explorer.ts';
import { type BookPosition, bookPosition } from '#page/review/practice/book.ts';
import type { Entry } from '#page/review/practice/repertoire.ts';
import { AUTO_LENGTH, type PracticeSettings } from '#page/review/practice/settings.ts';
import type { PracticeState } from '#page/review/practice/state.ts';
import { START_FEN } from '#shared/chess/fen.ts';
import { type FakeController, fakeController } from './fake-lichess.ts';

// Test support for opening practice: a free board with a line played on it,
// a practice state around it, and books and repertoire entries built short.

export interface PracticeBoard {
  readonly ctrl: FakeController;
  readonly analysis: Analysis;
  /** The path after each move, the start's ('') first. */
  readonly paths: readonly string[];
}

/** The free board after `ucis` from the start, left on the last move. */
export function practiceBoard(ucis: readonly string[]): PracticeBoard {
  const ctrl = fakeController({
    id: 'synthetic',
    synthetic: true,
    positions: [{ ply: 0, fen: START_FEN }],
  });
  const paths = [''];
  for (const uci of ucis) {
    ctrl.playUci(uci);
    paths.push(ctrl.path);
  }
  return { ctrl, analysis: new Analysis(ctrl), paths };
}

/** A first visit's settings (practice/settings.ts). */
const SETTINGS: PracticeSettings = {
  length: AUTO_LENGTH,
  lines: 'main',
  moves: 'mine',
  level: 'mine',
  goal: 20,
};

/** A line of practice from the start, as White, on no book yet. */
export function practiceState(
  overrides: Omit<Partial<PracticeState>, 'settings'> & {
    settings?: Partial<PracticeSettings>;
  } = {},
): PracticeState {
  const { settings, ...rest } = overrides;
  return {
    start: '',
    side: 'white',
    opening: '',
    books: new Map(),
    source: null,
    own: null,
    aims: null,
    length: null,
    depth: 4,
    grew: null,
    explorerWas: false,
    waiting: null,
    hints: 0,
    hintsAt: '',
    hinted: new Set(),
    miss: null,
    misses: 0,
    refused: null,
    deviated: null,
    revealed: new Set(),
    met: new Set(),
    streak: 0,
    bestStreak: 0,
    scored: new Set(),
    missedAt: new Set(),
    cheers: new Map(),
    ended: null,
    at: '',
    forward: false,
    ...rest,
    settings: { ...SETTINGS, ...settings },
  };
}

/** A move of the explorer's answer: its SAN, its UCI, its games, its opening's name. */
export type ExplorerRow = readonly [san: string, uci: string, games: number, opening?: string];

export function explorerData(rows: readonly ExplorerRow[], opening = ''): ExplorerData {
  return {
    white: 0,
    draws: 0,
    black: 0,
    opening: opening ? { eco: 'A00', name: opening } : null,
    moves: rows.map(([san, uci, games, name]) => ({
      san,
      uci,
      white: games,
      draws: 0,
      black: 0,
      opening: name ? { eco: 'A00', name } : null,
    })),
  };
}

/** The explorer's book for a position: its moves, the most played first. */
export const explorerBook = (rows: readonly ExplorerRow[], opening = ''): BookPosition =>
  bookPosition(explorerData(rows, opening));

/** A repertoire entry, met once and found. */
export const entry = (overrides: Partial<Entry> & Pick<Entry, 'moves'>): Entry => ({
  side: 'white',
  name: '',
  answers: [],
  seen: 1,
  missed: 0,
  level: 1,
  due: 0,
  last: 0,
  ...overrides,
});
