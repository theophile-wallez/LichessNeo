import { vi } from 'vitest';
import { z } from 'zod/mini';
import { StoredRecordCodec } from '#page/review/evaluation/stored.ts';
import { someMove } from './fake-chess.ts';
import { type FakeController, fakeController, fenAfter } from './fake-lichess.ts';
import { mountFakePage } from './fake-page.ts';
import { FAKE_STOCKFISH_URL, installFakeStockfish, type SearchDelay } from './fake-stockfish.ts';
import { fakeReviewLayout } from './fake-review-layout.ts';
import { fixtureGames, type FixtureGame } from './replay.ts';
import { hashOf, type ReviewSnapshot, snapshotReview } from './review-snapshot.ts';

// Test support: the Game Review driven through a script of steps on a fake
// analysis page, the same for the original script and the port, recording
// what the review shows after each step.

export interface Driver {
  readonly ctrl: FakeController;
  readonly advance: (milliseconds: number) => Promise<void>;
}

export interface Step {
  readonly name: string;
  readonly run: (driver: Driver) => Promise<void>;
}

const element = (selector: string): Element | null => document.querySelector(selector);

function dispatch(selector: string, type: string, clientX = 0): void {
  element(selector)?.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX }));
}

/** Clicks what `selector` finds, then lets the page run for `wait` ms. */
export const click = (name: string, selector: string, wait = 400, clientX = 0): Step => ({
  name,
  run: async ({ advance }) => {
    dispatch(selector, 'click', clientX);
    await advance(wait);
  },
});

export const wait = (name: string, milliseconds: number): Step => ({
  name,
  run: ({ advance }) => advance(milliseconds),
});

/** Something Lichess does (a jump, a move played), then its redraw. */
export const lichess = (name: string, act: (ctrl: FakeController) => void, pause = 400): Step => ({
  name,
  run: async ({ ctrl, advance }) => {
    act(ctrl);
    ctrl.redraw();
    await advance(pause);
  },
});

export const hover = (name: string, selector: string, clientX = 0): Step => ({
  name,
  run: async ({ advance }) => {
    dispatch(selector, 'pointerover', clientX);
    dispatch(selector, 'mousemove', clientX);
    await advance(50);
  },
});

/** Plays a move of its own from the position on the board. */
export const playOwn = (name: string, pause = 3000): Step =>
  lichess(name, ctrl => ctrl.playUci(someMove(ctrl.node.fen) ?? 'a2a3'), pause);

export interface Scenario {
  readonly game: string;
  readonly lang: string;
  /** The records of a finished review are in the cache: no engine runs for the game. */
  readonly cached: boolean;
  readonly synthetic?: boolean;
  /** The game's server analysis, in the export, for every other position. */
  readonly serverAnalysis?: boolean;
  /** Signed out: the masters database refuses every lookup. */
  readonly signedOut?: boolean;
  readonly steps: readonly Step[];
}

export function fixtureGame(name: string): FixtureGame {
  const game = fixtureGames().find(candidate => candidate.name === name);
  if (!game) throw new Error(`no fixture game ${name}`);
  return game;
}

const PLAYERS: readonly [Record<string, unknown>, Record<string, unknown>] = [
  { color: 'white', user: { username: 'Alice <3' }, rating: 1650 },
  { color: 'black', ai: 4 },
];

function exportFor(game: FixtureGame, scenario: Scenario): unknown {
  const analysis = game.records.slice(1).map((record, i) => {
    if (i % 2 === 1) return {};
    return 'mate' in record ? { mate: record.mate } : { eval: record.cp };
  });
  return {
    opening: { ply: game.bookPly, name: game.opening },
    ...(scenario.serverAnalysis ? { analysis } : {}),
  };
}

function stubNetwork(game: FixtureGame, scenario: Scenario): void {
  vi.stubGlobal(
    'fetch',
    vi.fn<(url: string) => Promise<Response>>(async url => {
      if (url.startsWith('/game/export/')) return Response.json(exportFor(game, scenario));
      // The cloud knows the first two positions only.
      const index = game.nodes.findIndex(node => url.includes(encodeURIComponent(node.fen)));
      if (index < 0 || index > 1) return new Response('', { status: 404 });
      return Response.json({ pvs: [{ moves: 'e2e4 e7e5', cp: 20 + index }] });
    }),
  );
}

function masters(fen: string): unknown {
  const moves = Number(fen.split(' ').at(-1));
  if (moves > 3) return { white: 1, draws: 0, black: 2, opening: null };
  return {
    white: 40,
    draws: 30,
    black: 20,
    opening: { name: `Line ${moves}: Deep, Deeper`, eco: `C${moves}0` },
  };
}

function refuse(): never {
  throw new Error('401');
}

/** The original's timing: a full-depth search takes 150 ms, a quick one 30 ms. */
export const SCRIPT_DELAY: SearchDelay = ({ depth }) => (depth >= 16 ? 150 : 30);

/**
 * The fake engine, which finds the positions it's sent in the fake game's
 * tree. Returns how many engines the page has booted so far.
 */
export function useFakeEngine(
  ctrl: FakeController,
  delay: SearchDelay = SCRIPT_DELAY,
): () => number {
  return installFakeStockfish(delay, (fen, moves) => fenAfter(ctrl.tree.root, fen, moves));
}

function installEngine(ctrl: FakeController): void {
  useFakeEngine(ctrl);
  // Two cores: one engine, as the original had, so the recordings still match.
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(2);
  // A small memory is all the fake engine needs.
  const RealMemory = WebAssembly.Memory;
  vi.spyOn(WebAssembly, 'Memory').mockImplementation(function smallMemory() {
    return new RealMemory({ initial: 1 });
  });
}

/** Sets the page up for `scenario`; `boot` then starts the review under test. */
export function setUp(scenario: Scenario): Driver {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'Date',
      'requestAnimationFrame',
    ],
  });
  const game = fixtureGame(scenario.game);
  const root = document.documentElement;
  root.lang = scenario.lang;
  localStorage.clear();
  // The original's storage keys and format, spelled out rather than taken from
  // the port: a change to them would orphan the caches users have.
  localStorage.setItem('lr-ext-coach', String(game.coach));
  const positions = scenario.synthetic ? game.nodes.slice(0, 1) : game.nodes;
  if (scenario.cached)
    localStorage.setItem(
      `lr-ext-review:${game.id}:${positions.length}:v1`,
      JSON.stringify(z.encode(z.array(StoredRecordCodec), [...game.records])),
    );
  const id = scenario.synthetic ? 'synthetic' : game.id;
  history.pushState({}, '', scenario.synthetic ? '/analysis' : `/${game.id}`);
  const ctrl = fakeController({
    id,
    positions,
    synthetic: scenario.synthetic ?? false,
    variant: game.chess960 ? 'chess960' : 'standard',
    players: PLAYERS,
    masters: scenario.signedOut ? refuse : masters,
    signedIn: !scenario.signedOut,
  });
  mountFakePage(ctrl);
  document.head.innerHTML =
    '<style>.lr-ext-review__graph, #lr-ext-review-graph { padding: 4px 8px } .lr-ext-bubble__sub { line-height: 18px }</style>';
  Object.assign(window, {
    site: {
      analysis: ctrl,
      asset: {
        url: (path: string) => (path.endsWith('.js') ? FAKE_STOCKFISH_URL : `/assets/${path}`),
      },
    },
  });
  installEngine(ctrl);
  stubNetwork(game, scenario);
  fakeReviewLayout();
  return {
    ctrl,
    advance: async milliseconds => {
      await vi.advanceTimersByTimeAsync(milliseconds);
    },
  };
}

function coachState(message: unknown): string | null {
  if (typeof message !== 'object' || message === null) return null;
  const { coach, mood, talking } = { coach: null, mood: null, talking: null, ...message };
  return `${String(coach)}/${String(mood)}/${String(talking)}`;
}

export interface ScenarioHooks {
  /** Starts the review under test. */
  readonly boot: () => void;
  /** The review's arrows on the board. */
  readonly arrows: () => unknown;
}

/** Runs the script, and what the review shows after each step, by the step's name. */
export async function runScenario(
  scenario: Scenario,
  { boot, arrows }: ScenarioHooks,
): Promise<Record<string, ReviewSnapshot>> {
  const driver = setUp(scenario);
  const posted: string[] = [];
  vi.spyOn(window, 'postMessage').mockImplementation((message: unknown) => {
    const state = coachState(message);
    if (state !== null) posted.push(state);
  });
  const cacheKey = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).find(
    key => key?.startsWith('lr-ext-review:'),
  );
  boot();
  const snapshots: Record<string, ReviewSnapshot> = {};
  for (const step of scenario.steps) {
    await step.run(driver);
    const key =
      cacheKey ??
      `lr-ext-review:${fixtureGame(scenario.game).id}:${driver.ctrl.mainline.length}:v1`;
    snapshots[step.name] = snapshotReview({
      arrows: arrows(),
      coach: `${posted.length} ${posted.at(-1) ?? ''}`,
      cache: hashOf(localStorage.getItem(key)),
    });
  }
  return snapshots;
}

export interface StepAgainstLegacy {
  readonly step: string;
  /** What the port shows after the step; null when the script has no such step. */
  readonly port: ReviewSnapshot | null;
  readonly legacy: unknown;
}

/** The review's state after each step, as the port shows it, next to the original's recording. */
export async function portAgainstLegacy(
  scenario: Scenario,
  hooks: ScenarioHooks,
  legacy: Readonly<Record<string, unknown>>,
): Promise<StepAgainstLegacy[]> {
  const snapshots = await runScenario(scenario, hooks);
  return Object.entries(legacy).map(([step, recorded]) => ({
    step,
    port: snapshots[step] ?? null,
    legacy: recorded,
  }));
}
