import { afterEach, describe, expect, it, vi } from 'vitest';
import { passedFen } from '#page/review/coach/threat.ts';
import { EnginePool, type PoolEngine } from '#page/review/engine/pool.ts';
import type { EngineSearch } from '#page/review/engine/stockfish.ts';
import type { EngineResult } from '#page/review/engine/uci.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import { pumpThreats, threatsAround } from './threats.ts';

afterEach(() => {
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'site');
});

/** An engine whose searches answer when the test says. */
function heldEngine() {
  const searches: EngineSearch[] = [];
  const answers: ((result: EngineResult) => void)[] = [];
  const failures: ((error: Error) => void)[] = [];
  const engine: PoolEngine = {
    running: true,
    analyse: search =>
      new Promise((resolve, reject) => {
        searches.push(search);
        answers.push(resolve);
        failures.push(reject);
      }),
    quit: () => {},
  };
  const answer = (result: EngineResult): void => answers.at(-1)?.(result);
  const fail = (): void => failures.at(-1)?.(new Error('the engine crashed'));
  return { engine, searches, answer, fail };
}

const THREAT: EngineResult = { lines: [{ cp: -250, pv: ['d7a4', 'g1f1'] }] };

const withLine = (move: JudgedMove): JudgedMove => ({
  ...move,
  after: { ...move.after, line: ['a2a3', 'a7a6'] },
});

/** The opera game judged, an engine of the test's, and its moves out of the book with a line. */
function setUp() {
  const { session, facade } = judgedGame('opera');
  const held = heldEngine();
  session.engine = Promise.resolve(new EnginePool([held.engine]));
  const judged = session.work.moves.filter(move => move !== undefined);
  const played = judged.filter(move => move.moveClass !== 'book').map(withLine);
  const book = judged.find(move => move.moveClass === 'book');
  if (!book || played.length < 2) throw new Error('no moves to search');
  return { session, facade, held, played, book: withLine(book), bare: judged.at(-1) };
}

/** The positions searched so far. */
const searched = ({ searches }: ReturnType<typeof heldEngine>): string[] =>
  searches.map(search => search.position);

const passed = (fen: string): string => `fen ${passedFen(fen) ?? ''}`;

async function answered(session: Session): Promise<void> {
  await vi.waitFor(() => {
    expect(session.threats.busy).toBe(false);
  });
}

describe('pumpThreats', () => {
  it('searches before a move, then after it, then after the next, one at a time', async () => {
    const { session, facade, held, played } = setUp();
    const [shown, next] = played;
    if (!shown || !next) throw new Error('no moves');
    pumpThreats(session, facade, [shown, next]);
    await vi.waitFor(() => {
      expect(searched(held)).toEqual([passed(shown.previousPosition.fen)]);
    });
    pumpThreats(session, facade, [shown, next]);
    expect(held.searches).toHaveLength(1);
    held.answer(THREAT);
    await answered(session);
    pumpThreats(session, facade, [shown, next]);
    await vi.waitFor(() => {
      expect(held.searches).toHaveLength(2);
    });
    held.answer(THREAT);
    await answered(session);
    pumpThreats(session, facade, [shown, next]);
    await vi.waitFor(() => {
      expect(searched(held)).toEqual([
        passed(shown.previousPosition.fen),
        passed(shown.position.fen),
        // The next move's position before is the shown one's after, searched already.
        passed(next.position.fen),
      ]);
    });
  });

  it('leaves out book moves, and moves whose record has no line to read a threat against', () => {
    const { session, facade, held, book, bare } = setUp();
    if (!bare || bare.after.line) throw new Error('no move without a line');
    pumpThreats(session, facade, [book, bare]);
    expect(session.threats.busy).toBe(false);
    expect(held.searches).toHaveLength(0);
  });

  it('keeps a failed search as none, and doesn’t search it again', async () => {
    const { session, facade, held, played } = setUp();
    const [shown] = played;
    if (!shown) throw new Error('no move');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    pumpThreats(session, facade, [shown]);
    await vi.waitFor(() => {
      expect(held.searches).toHaveLength(1);
    });
    held.fail();
    await answered(session);
    expect(threatsAround(session, shown).before).toBeNull();
    pumpThreats(session, facade, [shown]);
    await vi.waitFor(() => {
      expect(searched(held)).toEqual([
        passed(shown.previousPosition.fen),
        passed(shown.position.fen),
      ]);
    });
  });
});

describe('threatsAround', () => {
  it('has a move’s threats once searched, by the positions passed', async () => {
    const { session, facade, held, played } = setUp();
    const [shown] = played;
    if (!shown) throw new Error('no move');
    expect(threatsAround(session, shown)).toEqual({ before: null, after: null });
    pumpThreats(session, facade, [shown]);
    await vi.waitFor(() => {
      expect(held.searches).toHaveLength(1);
    });
    held.answer(THREAT);
    await answered(session);
    const fen = passedFen(shown.previousPosition.fen);
    const { before, after } = threatsAround(session, shown);
    expect(before?.fen).toBe(fen);
    expect(before?.record).toMatchObject({ best: 'd7a4', line: ['d7a4', 'g1f1'] });
    expect(after).toBeNull();
  });

  it('has none for a move without a line, whatever was searched', () => {
    const { session, played } = setUp();
    const [shown] = played;
    if (!shown) throw new Error('no move');
    const bare = { ...shown, after: { ...shown.after, line: undefined } };
    const fen = passedFen(shown.previousPosition.fen) ?? '';
    session.threats.found.set(fen, { fen, record: shown.before });
    expect(threatsAround(session, shown).before).not.toBeNull();
    expect(threatsAround(session, bare)).toEqual({ before: null, after: null });
  });
});
