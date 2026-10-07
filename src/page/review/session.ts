import { z } from 'zod/mini';
import type { Color } from '#shared/chess/types.ts';
import type { TreeNode } from '#page/lichess/tree.ts';
import type { StreamState } from './comment/markup.ts';
import type { EnginePool } from './engine/pool.ts';
import type { RecordsWork } from './game/records.ts';
import type { PositionRecord } from './evaluation/score.ts';
import type { ReviewLanguage } from './i18n/types.ts';
import type { ClassCounts } from './judge/summary.ts';
import type { MoveVerdict } from './judge/types.ts';
import type { GameRating } from './rating/rate-game.ts';
import type { ReviewElements } from './view/elements.ts';
import type { ReviewArrow } from '#page/board/review-arrows.ts';

// Everything the review keeps while a page is open, shared by its parts.

/** What the panel shows: the closed panel, the summary, the move-by-move review, or the free board's coach. */
export const ModeSchema = z.enum(['normal', 'summary', 'moves', 'live']);
export type Mode = z.infer<typeof ModeSchema>;
export const MODES: readonly Mode[] = ModeSchema.options;

/** A judged move; one played on the free board or off the game names its opening ('' for none). */
export interface JudgedMove extends MoveVerdict {
  readonly opening?: string;
}

export interface Review {
  /** The mainline's moves judged at full depth, by index (ply - 1). */
  readonly moves: readonly (JudgedMove | undefined)[];
  /** The same moves, with the quick pass's verdicts for those not judged at full depth yet. */
  readonly draft: readonly (JudgedMove | undefined)[];
  /** Positions in the game, known or not. */
  readonly total: number;
  readonly complete: boolean;
  readonly positions: readonly (PositionRecord | null)[];
  readonly accuracy: Readonly<Record<Color, number | null>>;
  readonly counts: ClassCounts;
  readonly rating: GameRating | null;
}

/** The engine's best move played on the board in place of `move` (the Best button). */
export interface BestShown {
  readonly path: string;
  readonly move: JudgedMove;
}

/** Explain's best line, played on the board from the position before `move` (the bubble's button). */
export interface LineShown {
  readonly path: string;
  readonly move: JudgedMove;
  readonly line: readonly string[];
}

/** Retry: the player looks for a better move than the error at `path`, from the position before. */
export interface RetryState {
  readonly path: string;
  readonly move: JudgedMove;
  /** The moves tried and judged no better. */
  misses: number;
  /** The miss on the board, already counted. */
  counted: string | null;
  /** The answer is on the board. */
  revealed: boolean;
}

export type GraphKind = 'summary' | 'moves';

export interface ViewState {
  mode: Mode;
  review: Review | null;
  /** Share of the game's positions analyzed at full depth. */
  progress: number;
  /** Bumped whenever the review changes, for the moves graph. */
  version: number;
  error: string | null;
  lastKey: string;
  explain: boolean;
  /** The play button's interval. */
  playing: number | null;
  /** The graphs that have drawn themselves in once. */
  readonly revealed: Set<GraphKind>;
  bestOf: BestShown | null;
  lineOf: LineShown | null;
  retry: RetryState | null;
  /** The arrow of the comment's move under the pointer (view/chips.ts). */
  hover: ReviewArrow | null;
  /** The summary's chevron is open. */
  allRows: boolean;
  /** The ply the summary was opened on. Moving to another ply opens the move-by-move review. */
  summaryPly: number | undefined;
  drawnMode: Mode | null;
  /** The game’s opening, from its export: named on its last book move only. */
  openingName: string;
  /** What the eval bar last showed during the review. */
  barPosition: PositionRecord | null;
  /** The board overlay's markup, as last drawn. */
  overlay: string;
}

export interface BookEntry {
  readonly book: boolean;
  readonly name: string;
  readonly eco: string;
}

/** The moves judged as they're played: the free board's, and those played off a game. */
export interface LiveState {
  /** Engine records by FEN. */
  readonly evals: Map<string, PositionRecord>;
  /** Masters database verdicts by FEN. */
  readonly books: Map<string, BookEntry>;
  readonly judged: Map<string, { readonly node: TreeNode; readonly move: JudgedMove | null }>;
  busy: boolean;
  bookBusy: boolean;
  /** The masters database can't be reached (signed out): no move is book. */
  noBook: boolean;
  error: string | null;
}

/** Explain's engine lines, by position and first move (explain/lines.ts). */
export interface LineLookups {
  readonly found: Map<string, readonly string[]>;
  busy: boolean;
}

/** The game's analysis as it comes in (`RecordsWork`), and the review's own part of it. */
export interface GameWork extends RecordsWork {
  nodes: readonly TreeNode[];
  readonly moves: (JudgedMove | undefined)[];
  bookPly: number;
}

export interface AvatarState {
  /** The coach's number, 1 to COACH_COUNT. */
  id: number;
  /** The move whose verdict the coach last reacted to. */
  reacted: string;
  /** The avatar kept across renders, so its animation carries on. */
  avatar: HTMLElement | null;
}

export interface Stream {
  state: StreamState;
  /** The typing's interval, 0 when idle. */
  timer: number;
}

export interface Session {
  readonly language: ReviewLanguage;
  readonly elements: ReviewElements;
  readonly view: ViewState;
  readonly live: LiveState;
  readonly work: GameWork;
  readonly lines: LineLookups;
  readonly coach: AvatarState;
  readonly stream: Stream;
  /** The desktop layout, the only one with room for the review (review.css). */
  readonly wide: MediaQueryList;
  /** The element the tooltip points at. */
  tipFor: Element | null;
  /** The page's engines, once asked for (engine-pool.ts). */
  engine: Promise<EnginePool> | null;
  /** Draws the panel again; forced, even when nothing it shows changed. */
  readonly redraw: (force?: boolean) => void;
  readonly setMode: (mode: Mode) => void;
}

export interface SessionOptions {
  readonly language: ReviewLanguage;
  readonly coach: number;
  readonly elements: ReviewElements;
  readonly redraw: (force?: boolean) => void;
  readonly setMode: (mode: Mode) => void;
}

export function createSession(options: SessionOptions): Session {
  const { language, coach, elements, redraw, setMode } = options;
  return {
    language,
    elements,
    view: {
      mode: 'summary',
      review: null,
      progress: 0,
      version: 0,
      error: null,
      lastKey: '',
      explain: false,
      playing: null,
      revealed: new Set(),
      bestOf: null,
      lineOf: null,
      retry: null,
      hover: null,
      allRows: false,
      summaryPly: undefined,
      drawnMode: null,
      openingName: '',
      barPosition: null,
      overlay: '',
    },
    live: {
      evals: new Map(),
      books: new Map(),
      judged: new Map(),
      busy: false,
      bookBusy: false,
      noBook: false,
      error: null,
    },
    work: {
      nodes: [],
      deep: [],
      rough: [],
      moves: [],
      bookPly: 0,
      cloudAt: Infinity,
      pending: new Set(),
      searched: 0,
    },
    lines: { found: new Map(), busy: false },
    coach: { id: coach, reacted: '', avatar: null },
    stream: { state: { key: '', shown: 0, dropped: false }, timer: 0 },
    wide: matchMedia('(min-width: 1020px)'),
    tipFor: null,
    engine: null,
    redraw,
    setMode,
  };
}
