import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnginePool, type PoolEngine } from '#page/review/engine/pool.ts';
import type { EngineSearch } from '#page/review/engine/stockfish.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import type { JudgedMove } from '#page/review/session.ts';
import { bestRequest, explainLines, foundLine, pumpLines } from './lines.ts';

afterEach(() => {
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'site');
});

/** An engine that plays out the move it's asked about, then a7a6. */
function lineEngine() {
  const searches: EngineSearch[] = [];
  const engine: PoolEngine = {
    running: true,
    analyse: search => {
      searches.push(search);
      return Promise.resolve({ lines: [{ cp: 0, pv: [...(search.searchMoves ?? []), 'a7a6'] }] });
    },
    quit: () => {},
  };
  return { engine, searches };
}

const keeping = (move: JudgedMove): JudgedMove => ({
  ...move,
  before: { ...move.before, line: ['f8c5', 'a2a3', 'a7a6'] },
  after: { ...move.after, line: ['d1d2', 'a7a6'] },
});

/** The opera game's inaccuracy, ♛e7, with or without the lines its records keep. */
function setUp(kept: boolean) {
  const { session, facade } = judgedGame('opera');
  const { engine, searches } = lineEngine();
  session.engine = Promise.resolve(new EnginePool([engine]));
  const inaccuracy = session.work.moves[13];
  if (inaccuracy?.moveClass !== 'inaccuracy') throw new Error('no inaccuracy');
  return { session, facade, searches, move: kept ? keeping(inaccuracy) : inaccuracy };
}

describe('Explain’s lines', () => {
  it('are the records’ own, at once, without a search', () => {
    const { session, facade, searches, move } = setUp(true);
    expect(foundLine(session, bestRequest(move))).toEqual(['f8c5', 'a2a3', 'a7a6']);
    expect(explainLines(session, move)).toEqual({
      best: ['f8c5', 'a2a3', 'a7a6'],
      punishment: ['d1d2', 'a7a6'],
    });
    pumpLines(session, facade, move);
    expect(session.lines.busy).toBe(false);
    expect(searches).toHaveLength(0);
  });

  it('are played out by the engine from their first move when the records kept none', async () => {
    const { session, facade, searches, move } = setUp(false);
    expect(explainLines(session, move)).toBeNull();
    pumpLines(session, facade, move);
    await vi.waitFor(() => {
      expect(session.lines.found.size).toBe(1);
    });
    pumpLines(session, facade, move);
    await vi.waitFor(() => {
      expect(session.lines.found.size).toBe(2);
    });
    const best = move.best ?? '';
    const reply = move.after.best ?? '';
    expect(searches.map(search => search.searchMoves)).toEqual([[best], [reply]]);
    expect(explainLines(session, move)).toEqual({
      best: [best, 'a7a6'],
      punishment: [reply, 'a7a6'],
    });
  });
});
