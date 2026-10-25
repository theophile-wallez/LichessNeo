import { afterEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import type { Session } from '#page/review/session.ts';
import { watchClicks } from './clicks.ts';
import { timesMarkup } from './graph-times.ts';
import { syncModeTabs } from './mode-tabs.ts';
import { renderMoves } from './moves-panel.ts';
import { keepMarked } from './render.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
  document.documentElement.className = '';
});

/** The opera game's move-by-move panel on its tenth move, with its clicks watched. */
function movesPanel(clocks: boolean): Session {
  const { session: judged, ctrl, facade } = judgedGame('opera');
  const redraw = (): void => {
    renderMoves(session, facade);
    syncModeTabs(session, facade);
  };
  const session: Session = { ...judged, redraw };
  if (clocks) {
    const game = ctrl.data.game;
    // Each move a second longer than the one before.
    const moveCentis = ctrl.mainline.slice(1).map((_, i) => (i + 1) * 100);
    ctrl.data.game = typeof game === 'object' ? { ...game, moveCentis } : game;
  }
  ctrl.jumpToMain(10);
  session.view.mode = 'moves';
  document.body.append(session.elements.panel);
  watchClicks(session);
  session.redraw();
  return session;
}

const viewButton = (session: Session, view: string): HTMLElement | null =>
  queryOne(
    session.elements.panel,
    `[data-ln-ext="graph"][data-ln-ext-view="${view}"]`,
    HTMLElement,
  );

const columns = (session: Session): SVGElement[] =>
  queryAll(session.elements.graphBox, '.ln-ext-graph-bar', SVGElement);

const y = (bar: SVGElement): number => Number(bar.getAttribute('y'));
const height = (bar: SVGElement): number => Number(bar.getAttribute('height'));

describe('the move-by-move graph’s views', () => {
  it('offer the advantage and the move times, the advantage picked', () => {
    const session = movesPanel(true);
    const { graphViews } = session.elements;
    expect(graphViews.hidden).toBe(false);
    expect(queryAll(graphViews, 'button', HTMLElement).map(button => button.textContent)).toEqual([
      'Advantage',
      'Time',
    ]);
    expect(viewButton(session, 'advantage')?.getAttribute('aria-pressed')).toBe('true');
    expect(columns(session)).toHaveLength(0);
  });

  it('draw each move’s time once Time is picked, the move on the board’s marked', () => {
    const session = movesPanel(true);
    viewButton(session, 'time')?.click();
    expect(session.view.graph).toBe('time');
    expect(viewButton(session, 'time')?.getAttribute('aria-pressed')).toBe('true');
    const bars = columns(session);
    expect(bars).toHaveLength(session.view.review?.moves.length ?? 0);
    expect(bars.slice(0, 2).map(bar => bar.classList.contains('ln-ext-graph-bar--white'))).toEqual([
      true,
      false,
    ]);
    // The tenth move's.
    expect(bars.findIndex(bar => bar.classList.contains('ln-ext-graph-bar--now'))).toBe(9);
  });

  it('put White’s columns above the middle and Black’s below, the longest the tallest', () => {
    const times = [
      { ply: 1, color: 'white', san: '1. e4', seconds: 4, clock: null },
      { ply: 2, color: 'black', san: '1… e5', seconds: 8, clock: null },
    ] as const;
    document.body.innerHTML = timesMarkup(
      { times, last: 2, ply: 2 },
      { width: 200, height: 84 },
    ).value;
    const [white, black] = queryAll(document.body, '.ln-ext-graph-bar', SVGElement);
    if (!white || !black) throw new Error('no columns');
    expect(y(white) + height(white)).toBeCloseTo(42, 1);
    expect(y(black)).toBeCloseTo(42, 1);
    expect(height(black)).toBeGreaterThan(height(white));
    expect(black.classList.contains('ln-ext-graph-bar--now')).toBe(true);
  });

  it('keep their buttons across redraws, for the pick to slide, and ease the graph in', () => {
    const session = movesPanel(true);
    const time = viewButton(session, 'time');
    time?.click();
    expect(viewButton(session, 'time')).toBe(time);
    const graph = session.elements.graphBox.firstElementChild;
    expect(graph?.classList.contains('ln-ext-graph-switch')).toBe(true);
    session.redraw();
    expect(session.elements.graphBox.firstElementChild?.classList).not.toContain(
      'ln-ext-graph-switch',
    );
  });

  it('are left out of a game without clocks, which shows its advantage', () => {
    const session = movesPanel(false);
    session.view.graph = 'time';
    session.redraw();
    expect(session.elements.graphViews.hidden).toBe(true);
    expect(columns(session)).toHaveLength(0);
    expect(session.elements.graphBox.querySelector('svg')).not.toBeNull();
  });
});

describe('the game’s sheet', () => {
  it('opens over the panel from the tabs’ share button, and closes from it', () => {
    const session = movesPanel(false);
    const share = (): HTMLElement | null =>
      queryOne(session.elements.modes, '[data-ln-ext="share"]', HTMLElement);
    expect(share()?.getAttribute('aria-pressed')).toBe('false');
    share()?.click();
    expect(session.view.sheet).toBe(true);
    expect(share()?.getAttribute('aria-pressed')).toBe('true');
    share()?.click();
    expect(session.view.sheet).toBe(false);
  });

  it('marks the page while it’s open in a game’s modes, not on the free board', async () => {
    const root = document.documentElement;
    const session = movesPanel(false);
    session.view.sheet = true;
    keepMarked(session);
    root.className = 'light';
    await flush();
    expect(root.classList.contains('ln-ext-review-sheet')).toBe(true);
    session.view.mode = 'summary';
    root.className = 'light';
    await flush();
    expect(root.classList.contains('ln-ext-review-sheet')).toBe(true);
    session.view.mode = 'live';
    root.className = 'light';
    await flush();
    expect(root.classList.contains('ln-ext-review-sheet')).toBe(false);
  });
});
