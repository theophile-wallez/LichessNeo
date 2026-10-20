import { afterEach, describe, expect, it, vi } from 'vitest';
import { analysis } from '#page/lichess/analysis.ts';
import { EnginePool, type PoolEngine } from '#page/review/engine/pool.ts';
import { withFakeSite } from '#page/review/fixtures/fake-lichess.ts';
import { liveTree } from '#page/review/fixtures/live-tree.ts';
import { recordFor } from '#page/review/fixtures/unit-cases.ts';
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
  for (const node of wanted(facade, treeMovePaths())) {
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
