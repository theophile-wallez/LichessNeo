// Records the site's live review (site/demo): Morphy's Opera Game, every
// position searched by a native Stockfish as the review searches them in the
// browser (two lines, FULL_SEARCH's depth), and the threats around each move
// (the null-move searches of explain/threats.ts, QUICK_SEARCH's depth). The
// page then judges and comments on the game with the review's own code. Run
// by hand, then commit site/demo/opera.json:
//
//   node scripts/site/record-demo.ts [--stockfish /path/to/stockfish]

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { normalizeUci } from '#page/review/chess/notation.ts';
import { passedFen } from '#page/review/coach/threat.ts';
import { uciPosition, type PathPosition } from '#page/review/engine/position.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { FULL_SEARCH, QUICK_SEARCH } from '#page/review/engine/settings.ts';
import { SearchCollector, type EngineResult } from '#page/review/engine/uci.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { fromRoot } from '#scripts/lib/paths.ts';

const { values } = parseArgs({ options: { stockfish: { type: 'string', default: 'stockfish' } } });

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Paris, 1858: Paul Morphy against the Duke of Brunswick and Count Isouard, at
// the opera. Castling as Lichess writes it, the king taking its rook.
const MOVES = [
  ['e2e4', 'e4'],
  ['e7e5', 'e5'],
  ['g1f3', 'Nf3'],
  ['d7d6', 'd6'],
  ['d2d4', 'd4'],
  ['c8g4', 'Bg4'],
  ['d4e5', 'dxe5'],
  ['g4f3', 'Bxf3'],
  ['d1f3', 'Qxf3'],
  ['d6e5', 'dxe5'],
  ['f1c4', 'Bc4'],
  ['g8f6', 'Nf6'],
  ['f3b3', 'Qb3'],
  ['d8e7', 'Qe7'],
  ['b1c3', 'Nc3'],
  ['c7c6', 'c6'],
  ['c1g5', 'Bg5'],
  ['b7b5', 'b5'],
  ['c3b5', 'Nxb5'],
  ['c6b5', 'cxb5'],
  ['c4b5', 'Bxb5+'],
  ['b8d7', 'Nbd7'],
  ['e1a1', 'O-O-O'],
  ['a8d8', 'Rd8'],
  ['d1d7', 'Rxd7'],
  ['d8d7', 'Rxd7'],
  ['h1d1', 'Rd1'],
  ['e7e6', 'Qe6'],
  ['b5d7', 'Bxd7+'],
  ['f6d7', 'Nxd7'],
  ['b3b8', 'Qb8+'],
  ['d7b8', 'Nxb8'],
  ['d1d8', 'Rd8#'],
] as const;

/** A UCI engine, one command at a time. */
class Engine {
  readonly #process = spawn(values.stockfish, [], { stdio: ['pipe', 'pipe', 'inherit'] });
  readonly #lines = createInterface({ input: this.#process.stdout });
  #waiting: ((line: string) => void) | null = null;

  constructor() {
    this.#lines.on('line', line => this.#waiting?.(line));
  }

  send(command: string): void {
    this.#process.stdin.write(`${command}\n`);
  }

  /** Sends `command`, then hands each line of output to `read` until it returns a value. */
  async ask<T>(command: string, read: (line: string) => T | null): Promise<T> {
    const answer = new Promise<T>(resolve => {
      this.#waiting = line => {
        const value = read(line);
        if (value !== null) resolve(value);
      };
    });
    this.send(command);
    return answer;
  }

  async search(position: string, depth: number): Promise<EngineResult> {
    this.send(`position ${position}`);
    const collector = new SearchCollector();
    return this.ask(`go depth ${depth}`, line => collector.read(line));
  }

  /** The FEN the engine reaches after `position`, as its `d` prints it. */
  async fen(position: string): Promise<string> {
    this.send(`position ${position}`);
    return this.ask('d', line => (line.startsWith('Fen: ') ? line.slice(5) : null));
  }

  quit(): void {
    this.send('quit');
  }
}

const engine = new Engine();
await engine.ask('uci', line => (line === 'uciok' ? true : null));
engine.send('setoption name Threads value 1');
engine.send('setoption name MultiPV value 2');
await engine.ask('isready', line => (line === 'readyok' ? true : null));

const nodes: PathPosition[] = [{ fen: START }];
const sans: (string | undefined)[] = [undefined];
const played: string[] = [];
for (const [uci, san] of MOVES) {
  played.push(normalizeUci(uci, nodes.at(-1)?.fen ?? START, false));
  nodes.push({ fen: await engine.fen(`startpos moves ${played.join(' ')}`), uci });
  sans.push(san);
}

const records: PositionRecord[] = [];
for (let i = 0; i < nodes.length; i++) {
  const fen = nodes[i]?.fen ?? START;
  const result = await engine.search(uciPosition(nodes.slice(0, i + 1), false), FULL_SEARCH.depth);
  records.push(toRecord(fen, result));
  console.log(`Searched ply ${i}: ${sans[i] ?? 'start'}`);
}

// The threats: every position with the other side to move, as the review searches them.
const threats: Record<string, PositionRecord> = {};
for (const { fen } of nodes) {
  const passed = passedFen(fen);
  if (passed === null || threats[passed]) continue;
  threats[passed] = toRecord(passed, await engine.search(`fen ${passed}`, QUICK_SEARCH.depth));
}
engine.quit();

const demo = {
  opening: 'Philidor Defense',
  bookPly: 4,
  nodes: nodes.map((node, i) => ({ ply: i, fen: node.fen, uci: node.uci, san: sans[i] })),
  records,
  threats,
};
await writeFile(fromRoot('site/demo/opera.json'), `${JSON.stringify(demo)}\n`);
console.log('Wrote site/demo/opera.json.');
