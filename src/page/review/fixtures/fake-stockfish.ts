import { playUci, someMove } from './fake-chess.ts';
import { fnv } from './fnv.ts';

// Test support: a stand-in for Lichess's Stockfish build, loaded like it
// through `site.asset.url`. Its scores come from a hash of the position, so
// every run (and the original script and the port) sees the same lines.

/** A module that hands the factory's options to `globalThis.lnExtFakeStockfish`. */
export const FAKE_STOCKFISH_URL = `data:text/javascript,${encodeURIComponent(
  'export default async options => globalThis.lnExtFakeStockfish(options);',
)}`;

/** A line of five moves from `first`, each side then pushing a pawn. */
function lineFrom(fen: string, first: string): string[] {
  const line = [first];
  let at = playUci(fen, first).fen;
  for (let next = someMove(at); next && line.length < 5; next = someMove(at)) {
    line.push(next);
    at = playUci(at, next).fen;
  }
  return line;
}

/**
 * The fake engine's output for a search: two scored lines, then the best
 * move. Asked for one move (`searchmoves`), a line of several from it.
 */
function fakeSearch(fen: string, depth: number, only: string | undefined): string[] {
  const score = (fnv(fen) % 700) - 350;
  if (only) {
    const line = lineFrom(fen, only).join(' ');
    return [`info depth ${depth} multipv 1 score cp ${score} pv ${line}`, `bestmove ${only}`];
  }
  const best = someMove(fen);
  const second = score - (fnv(`${fen}:2`) % 300);
  const pv = best ? ` pv ${best}` : '';
  return [
    `info depth ${depth} multipv 1 score cp ${score}${pv}`,
    `info depth ${depth} multipv 2 score cp ${second}${pv}`,
    `bestmove ${best ?? '(none)'}`,
  ];
}

interface FakeModule {
  listen: (line: string) => void;
  uci: (command: string) => void;
  getRecommendedNnue: () => string;
  setNnueBuffer: () => void;
}

/** The FEN that `moves` (in the engine's notation) reach from `fen`. */
export type ResolvePosition = (fen: string, moves: readonly string[]) => string;

/** How long a search takes, in ms of the (fake) clock; null for one that never answers. */
export type SearchDelay = (search: {
  readonly depth: number;
  readonly fen: string;
  /** The moves sent after the FEN it was given (`position fen … moves …`). */
  readonly moves: readonly string[];
  /** Which engine of the page searches it, in boot order from 0. */
  readonly engine: number;
}) => number | null;

/**
 * Installs the fake: each search answers after `delay` ms of the (fake)
 * clock. Returns how many engines the page has booted so far.
 */
export function installFakeStockfish(
  delay: SearchDelay,
  resolve: ResolvePosition = fen => fen,
): () => number {
  let booted = 0;
  const factory = (): FakeModule => {
    const engine = booted++;
    let fen = '';
    let moves: readonly string[] = [];
    const module: FakeModule = {
      listen: () => {},
      uci: command => {
        if (command.startsWith('position fen ')) {
          const [from = '', after] = command.slice('position fen '.length).split(' moves ');
          moves = after?.split(' ') ?? [];
          fen = resolve(from, moves);
        }
        const depth = /^go depth (\d+)/.exec(command)?.[1];
        if (depth === undefined) return;
        const only = / searchmoves (\S+)/.exec(command)?.[1];
        const lines = fakeSearch(fen, Number(depth), only);
        const wait = delay({ depth: Number(depth), fen, moves, engine });
        if (wait === null) return;
        setTimeout(() => {
          for (const line of lines) module.listen(line);
        }, wait);
      },
      getRecommendedNnue: () => '',
      setNnueBuffer: () => {},
    };
    return module;
  };
  Reflect.set(globalThis, 'lnExtFakeStockfish', factory);
  return () => booted;
}
