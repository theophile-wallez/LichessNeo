import { afterEach, describe, expect, it, vi } from 'vitest';
import { passedFen } from '#page/review/coach/threat.ts';
import { EnginePool, type PoolEngine } from '#page/review/engine/pool.ts';
import type { EngineSearch } from '#page/review/engine/stockfish.ts';
import type { EngineResult } from '#page/review/engine/uci.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import { renderMoves } from './moves-panel.ts';
import { render } from './render.ts';
import { renderKey } from './render-key.ts';

// The threats the coach reads, as the view asks for them and waits for them.

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.className = '';
  Reflect.deleteProperty(window, 'site');
  localStorage.clear();
});

const QUIET: EngineResult = { lines: [{ cp: 0, pv: ['a2a3', 'a7a6'] }] };

const withLine = (move: JudgedMove | undefined): JudgedMove | undefined =>
  move && { ...move, after: { ...move.after, line: ['a2a3', 'a7a6'] } };

/** The opera game judged, each move with a line to read threats against, and an engine that answers at once. */
function setUp(complete: boolean) {
  const game = judgedGame('opera');
  const { session } = game;
  const { review } = session.view;
  if (!review) throw new Error('no review');
  session.view.review = { ...review, complete, moves: review.moves.map(withLine) };
  const searched: string[] = [];
  const engine: PoolEngine = {
    running: true,
    analyse: (search: EngineSearch) => {
      searched.push(search.position.replace(/^fen /, ''));
      return Promise.resolve(QUIET);
    },
    quit: () => {},
  };
  session.engine = Promise.resolve(new EnginePool([engine]));
  document.body.innerHTML = '<main class="analyse"><div class="analyse__board"></div></main>';
  return { ...game, session, searched };
}

/** Renders the review until its threats' searches stop. */
async function renderAll(session: Session): Promise<void> {
  for (let pass = 0; pass < 80; pass++) {
    render(session);
    await vi.waitFor(() => {
      expect(session.threats.busy).toBe(false);
    });
  }
}

describe('the threats searched', () => {
  it('are every move’s once the game is analysed, from the summary', async () => {
    const { session, facade, searched } = setUp(true);
    session.view.mode = 'summary';
    session.view.summaryPly = facade.node.ply;
    await renderAll(session);
    const played = (session.view.review?.moves ?? []).filter(move => move?.moveClass !== 'book');
    const around = played.flatMap(move =>
      move
        ? [move.previousPosition.fen, move.position.fen].flatMap(fen => passedFen(fen) ?? [])
        : [],
    );
    expect(searched.toSorted()).toEqual([...new Set(around)].toSorted());
  });

  it('are none from the summary while the game is analysed', async () => {
    const { session, facade, searched } = setUp(false);
    session.view.mode = 'summary';
    session.view.summaryPly = facade.node.ply;
    await renderAll(session);
    expect(searched).toEqual([]);
  });
});

describe('the comment', () => {
  it('thinks until the threats around its move are searched', () => {
    const { session, ctrl, facade } = setUp(false);
    ctrl.jumpToMain(25);
    session.view.mode = 'moves';
    const move = session.view.review?.moves[24];
    if (!move) throw new Error('no move');
    renderMoves(session, facade);
    const panel = session.elements.panel;
    expect(panel.querySelector('.ln-ext-bubble__wait')).not.toBeNull();
    const waiting = renderKey(session, facade);
    for (const fen of [move.previousPosition.fen, move.position.fen])
      session.threats.found.set(passedFen(fen) ?? '', null);
    expect(renderKey(session, facade)).not.toBe(waiting);
    renderMoves(session, facade);
    expect(panel.querySelector('.ln-ext-bubble__wait')).toBeNull();
    expect(panel.querySelector('.ln-ext-bubble__sub')?.textContent).not.toBe('');
  });
});
