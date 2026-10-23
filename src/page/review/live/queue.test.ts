import { afterEach, describe, expect, it, vi } from 'vitest';
import { analysis } from '#page/lichess/analysis.ts';
import { EnginePool, type PoolEngine } from '#page/review/engine/pool.ts';
import { withFakeSite } from '#page/review/fixtures/fake-lichess.ts';
import { liveTree } from '#page/review/fixtures/live-tree.ts';
import { LIVE_TREE, recordFor } from '#page/review/fixtures/unit-cases.ts';
import { newSession } from '#page/review/fixtures/unit-review.ts';
import { pump, treeMovePaths, wanted } from './queue.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

/** The free board's tree, every position of it evaluated and looked up, and the engine's searches. */
function lookedUp() {
  const { ctrl } = liveTree();
  withFakeSite(ctrl);
  const facade = analysis();
  if (!facade) throw new Error('no controller');
  const session = newSession();
  for (const node of wanted(facade, treeMovePaths(facade))) {
    session.live.evals.set(node.fen, recordFor(node.fen, null));
    session.live.books.set(node.fen, { book: false, name: '', eco: '' });
  }
  const searched: string[] = [];
  const engine: PoolEngine = {
    running: true,
    analyse: search => {
      searched.push(search.position);
      return new Promise(() => {});
    },
    quit: () => {},
  };
  session.engine = Promise.resolve(new EnginePool([engine]));
  return { facade, session, searched };
}

describe('pump', () => {
  it('looks no further after a pass that found nothing, until something changes', async () => {
    const { facade, session, searched } = lookedUp();
    pump(session, facade);
    const reads = vi.spyOn(facade, 'nodeAtPath');
    pump(session, facade);
    expect(reads).not.toHaveBeenCalled();
    // A position forgotten is looked up again.
    session.live.evals.delete(facade.node.fen);
    pump(session, facade);
    await vi.waitFor(() => {
      expect(searched).toEqual([`fen ${facade.node.fen}`]);
    });
  });
});

describe('the moves to judge', () => {
  it('leaves out the computer lines the review hides, unless the user stepped into one', () => {
    const { ctrl, paths } = liveTree();
    withFakeSite(ctrl);
    const facade = analysis();
    if (!facade) throw new Error('no controller');
    const variation = paths.slice(LIVE_TREE.line.length);
    expect(treeMovePaths(facade)).toEqual(expect.arrayContaining(variation));
    // The same moves as a server analysis's line.
    for (const path of variation) Reflect.set(facade.nodeAtPath(path), 'comp', true);
    expect(treeMovePaths(facade).filter(path => variation.includes(path))).toEqual([]);
    // Stepped into, it's the user's line (view/move-list.ts marks it).
    for (const line of document.querySelectorAll('main.analyse .tview2 interrupt line'))
      line.classList.add('ln-ext-var');
    expect(treeMovePaths(facade)).toEqual(expect.arrayContaining(variation));
  });
});
