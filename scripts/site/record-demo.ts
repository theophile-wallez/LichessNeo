// Records the site's live review (site/demo): Morphy's Opera Game, as the
// review on lichess.org's analysis board sees it. Every position is searched
// by Lichess's own engine, the build the review runs in the browser, set up
// and limited as it is (FULL_SEARCH), and the threats around each move by the
// null-move searches of explain/threats.ts (QUICK_SEARCH); the book is what
// the masters' explorer plays, as the free board reads it (live/judging.ts).
// The page then judges and comments on the game with the review's own code.
// Run by hand, then commit site/demo/opera.json:
//
//   node scripts/site/record-demo.ts

import { writeFile } from 'node:fs/promises';
import { ExplorerDataSchema } from '#page/lichess/explorer.ts';
import { normalizeUci } from '#page/review/chess/notation.ts';
import { passedFen } from '#page/review/coach/threat.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { FULL_SEARCH, QUICK_SEARCH } from '#page/review/engine/settings.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { BOOK_GAMES, BOOK_PLIES } from '#page/review/live/judging.ts';
import { fromRoot } from '#scripts/lib/paths.ts';
import { WebStockfish } from './stockfish-web.ts';

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

const MASTERS = 'https://explorer.lichess.ovh/masters';

/** What the masters play in a position: its games, and the opening's name. */
async function masters(fen: string): Promise<{ games: number; name: string }> {
  const response = await fetch(`${MASTERS}?fen=${encodeURIComponent(fen)}&moves=0&topGames=0`);
  if (!response.ok) throw new Error(`the masters' explorer: ${response.status}`);
  const found = ExplorerDataSchema.parse(await response.json());
  return { games: found.white + found.draws + found.black, name: found.opening?.name ?? '' };
}

/** The game's last book move, and the opening named along the book. */
async function book(fens: readonly string[]): Promise<{ bookPly: number; opening: string }> {
  let opening = '';
  for (let ply = 1; ply < fens.length && ply <= BOOK_PLIES; ply++) {
    const found = await masters(fens[ply] ?? '');
    if (found.games < BOOK_GAMES) return { bookPly: ply - 1, opening };
    opening = found.name || opening;
  }
  return { bookPly: Math.min(fens.length - 1, BOOK_PLIES), opening };
}

const engine = await WebStockfish.boot();

const nodes: { fen: string; uci?: string }[] = [{ fen: START }];
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
  // The free board searches a position by its FEN alone.
  const result = await engine.search(`fen ${fen}`, FULL_SEARCH);
  records.push(toRecord(fen, result));
  console.log(`Searched ply ${i}: ${sans[i] ?? 'start'}`);
}

// The threats: every position with the other side to move, as the review searches them.
const threats: Record<string, PositionRecord> = {};
for (const { fen } of nodes) {
  const passed = passedFen(fen);
  if (passed === null || threats[passed]) continue;
  threats[passed] = toRecord(passed, await engine.search(`fen ${passed}`, QUICK_SEARCH));
}
await engine.quit();

const demo = {
  ...(await book(nodes.map(node => node.fen))),
  nodes: nodes.map((node, i) => ({ ply: i, fen: node.fen, uci: node.uci, san: sans[i] })),
  records,
  threats,
};
await writeFile(fromRoot('site/demo/opera.json'), `${JSON.stringify(demo)}\n`);
console.log('Wrote site/demo/opera.json.');
// The engine's threads would keep Node running.
process.exit(0);
