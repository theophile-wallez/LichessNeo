import { z } from 'zod/mini';
import type { Color } from '#shared/chess/types.ts';
import { isCardFolded } from '#page/game-over/card-fold.ts';
import type { TreeNode } from '#page/lichess/tree.ts';
import type { Threat } from './coach/threat.ts';
import type { StreamState } from './comment/markup.ts';
import type { EnginePool } from './engine/pool.ts';
import type { RecordsWork } from './game/records.ts';
import type { PositionRecord } from './evaluation/score.ts';
import type { ReviewLanguage } from './i18n/types.ts';
import type { ClassCounts } from './judge/summary.ts';
import type { MoveVerdict } from './judge/types.ts';
import type { GameRating } from './rating/rate-game.ts';
import { freshSetup, type OpeningsSetup } from './practice/setup.ts';
import type { Round } from './practice/rounds.ts';
import type { PracticeState } from './practice/state.ts';
import type { ReviewElements } from './view/elements.ts';
import type { Mark, ReviewArrow } from '#page/board/review-arrows.ts';

// Everything the review keeps while a page is open, shared by its parts.

/**
 * What the panel shows: the closed panel, the summary, the move-by-move review,
 * the free board's coach, or the free board's page of opening practice.
 */
export const ModeSchema = z.enum(['normal', 'summary', 'moves', 'live', 'openings']);
export type Mode = z.infer<typeof ModeSchema>;
export const MODES: readonly Mode[] = ModeSchema.options;

/** The free board's modes: its coach, and its page of opening practice. */
export const onFreeBoard = (mode: Mode): boolean => mode === 'live' || mode === 'openings';

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
  /** The hints asked for, up to `HINTS` (view/retry-hint.ts). */
  hints: number;
  /** The answer is on the board. */
  revealed: boolean;
}

export type GraphKind = 'summary' | 'moves';

/** What the move-by-move graph draws: the winning chances, or each move's time. */
export const GraphViewSchema = z.enum(['advantage', 'time']);
export type GraphView = z.infer<typeof GraphViewSchema>;

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
  graph: GraphView;
  /** The game's crosstable and export are open over the move-by-move panel. */
  sheet: boolean;
  /** The closed panel's card is folded down to its buttons. */
  cardFolded: boolean;
  bestOf: BestShown | null;
  lineOf: LineShown | null;
  retry: RetryState | null;
  /** Opening practice against the explorer's games, on the free board. */
  practice: PracticeState | null;
  /** The round of cards practice plays one after the other, if it plays one. */
  round: Round | null;
  /** The practice page's choices, before a line starts. */
  readonly openings: OpeningsSetup;
  /** The arrow of the comment's move under the pointer (view/chips.ts). */
  hover: ReviewArrow | null;
  /** The coach's drawing of its comment on the move at `path`. */
  drawing: { readonly path: string; readonly marks: readonly Mark[] };
  /** The summary's chevron is open. */
  allRows: boolean;
  /** The ply the summary was opened on. Moving to another ply opens the move-by-move review. */
  summaryPly: number | undefined;
  drawnMode: Mode | null;
  /** The game’s opening, from its export: named on its last book move only. */
  openingName: string;
  /** Its ECO code, '' when the export has none. */
  openingEco: string;
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
  /** The computer lines the user stepped into, by their first move's path: theirs from then on. */
  readonly entered: Set<string>;
}

/** The engine's searches the board's moves ask for, by key, one at a time. */
interface Lookups<T> {
  readonly found: Map<string, T>;
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

interface Stream {
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
  /** Explain's lines, by position and first move (explain/lines.ts). */
  readonly lines: Lookups<readonly string[]>;
  /** The threats around the moves, by passed position; null for a failed search (explain/threats.ts). */
  readonly threats: Lookups<Threat | null>;
  readonly coach: AvatarState;
  readonly stream: Stream;
  /** The desktop layout, the panel beside the board; below it, a column under it. */
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

const emptyLive = (): LiveState => ({
  evals: new Map(),
  books: new Map(),
  judged: new Map(),
  busy: false,
  bookBusy: false,
  noBook: false,
  error: null,
  entered: new Set(),
});

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
      graph: 'advantage',
      sheet: false,
      cardFolded: isCardFolded(),
      bestOf: null,
      lineOf: null,
      retry: null,
      practice: null,
      round: null,
      openings: freshSetup(),
      hover: null,
      drawing: { path: '', marks: [] },
      allRows: false,
      summaryPly: undefined,
      drawnMode: null,
      openingName: '',
      openingEco: '',
      barPosition: null,
      overlay: '',
    },
    live: emptyLive(),
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
    threats: { found: new Map(), busy: false },
    coach: { id: coach, reacted: '', avatar: null },
    stream: { state: { key: '', shown: 0, dropped: 0 }, timer: 0 },
    wide: matchMedia('(min-width: 1020px)'),
    tipFor: null,
    engine: null,
    redraw,
    setMode,
  };
}
