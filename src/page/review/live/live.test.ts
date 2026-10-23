import { afterEach, describe, expect, it } from 'vitest';
import { analysis } from '#page/lichess/analysis.ts';
import { withFakeSite } from '#page/review/fixtures/fake-lichess.ts';
import { liveTree } from '#page/review/fixtures/live-tree.ts';
import { LIVE_TREE } from '#page/review/fixtures/unit-cases.ts';
import { newSession } from '#page/review/fixtures/unit-review.ts';
import { bookAt, judgeAt, liveDigest, openingAt } from './judging.ts';
import { lookUpBook } from './lookups.ts';
import { bookGap, treeMovePaths, wanted } from './queue.ts';
// What the original script made of the same tree.
import legacy from './fixtures/legacy.json' with { type: 'json' };

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

function setUpTree() {
  const tree = liveTree();
  withFakeSite(tree.ctrl);
  const facade = analysis();
  if (!facade) throw new Error('no controller');
  const session = newSession();
  for (const [fen, record] of tree.evals) session.live.evals.set(fen, record);
  for (const [fen, entry] of tree.books) session.live.books.set(fen, entry);
  return { ...tree, facade, session };
}

describe('judging the moves played on the board', () => {
  it('judges each move of the tree as the original did', () => {
    const { paths, facade, session } = setUpTree();
    const { live } = session;
    const found = ['', ...paths, `${paths[2] ?? ''}zz`].map(path => {
      const move = judgeAt(live, facade, path);
      return {
        path,
        book: bookAt(live, facade, path) ?? 'undefined',
        opening: openingAt(live, facade, path),
        gap: bookGap(live, facade, path),
        digest: liveDigest(move),
        ply: move?.ply ?? null,
        opened: move?.opening ?? null,
      };
    });
    expect(found).toEqual(legacy.paths);
  });

  it('judges every move out of the book once the masters can’t be asked', () => {
    const { paths, facade, session } = setUpTree();
    session.live.noBook = true;
    const found = paths.map(path => [
      bookAt(session.live, facade, path) ?? 'undefined',
      liveDigest(judgeAt(session.live, facade, path)),
    ]);
    expect(found).toEqual(legacy.noBook);
  });

  it('keeps a move’s verdict until its node changes', () => {
    const { paths, facade, session } = setUpTree();
    const path = paths[0] ?? '';
    const first = judgeAt(session.live, facade, path);
    expect(judgeAt(session.live, facade, path)).toBe(first);
    session.live.judged.clear();
    expect(judgeAt(session.live, facade, path)).not.toBe(first);
  });
});

describe('the lookup queue', () => {
  it('asks for the positions in the original’s order', () => {
    const { ctrl, paths, facade } = setUpTree();
    const found = LIVE_TREE.boards.map(board => {
      ctrl.userJump(board === 0 ? '' : (paths[board - 1] ?? ''));
      return wanted(facade, treeMovePaths(facade)).map(node => node.fen);
    });
    expect(found).toEqual(legacy.wanted);
  });
});

describe('the masters database', () => {
  const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

  it('leaves out a position it didn’t answer for, signed in, and is given up signed out', async () => {
    const { ctrl, facade, session } = setUpTree();
    const { live } = session;
    ctrl.explorer.fetchMasterOpening = () => Promise.reject(new Error('Too Many Requests'));
    await lookUpBook(session, facade, FEN);
    expect(live.books.get(FEN)).toEqual({ book: false, name: '', eco: '' });
    expect(live.noBook).toBe(false);
    ctrl.explorer.isAuth = () => false;
    await lookUpBook(session, facade, FEN);
    expect(live.noBook).toBe(true);
  });
});
