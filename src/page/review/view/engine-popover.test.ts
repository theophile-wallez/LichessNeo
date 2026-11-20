import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { DEFAULT_REVIEW_ENGINE } from '#shared/review-engine/options.ts';
import { rectBetween } from '#shared/testing/layout.ts';
import { trackListeners } from '#shared/testing/listeners.ts';
import { flush } from '#shared/testing/timers.ts';
import { isOpen } from '#shared/ui-motion.ts';
import { pickReviewEngine } from '#page/review/engine/review-engine.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import type { Session } from '#page/review/session.ts';
import { watchClicks } from './clicks.ts';
import { syncEnginePopover } from './engine-popover.ts';
import { showTip } from './tooltip.ts';

// happy-dom rejects a stopped animation's promise, where a browser marks it handled: here
// each motion ends at once.
vi.mock('motion', () => ({
  animate: () => ({ finished: Promise.resolve(), stop: () => {} }),
  frame: { postRender: (callback: () => void) => callback() },
}));

let untrack: () => void = () => {};

beforeEach(() => {
  untrack = trackListeners(document);
});

afterEach(() => {
  untrack();
  pickReviewEngine(DEFAULT_REVIEW_ENGINE);
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

/** The opera game's review, analysed at the defaults, its engine button over the panel's graph. */
function review(): Session {
  const { session: judged, facade } = judgedGame('opera');
  const session: Session = { ...judged, redraw: () => syncEnginePopover(session, facade) };
  const { elements, work } = session;
  work.aim = { depth: 16, engine: 'light' };
  work.analysed = { depth: 16, engine: 'light' };
  elements.panel.append(elements.graphEngine);
  document.body.append(elements.modes, elements.panel);
  watchClicks(session);
  session.redraw();
  return session;
}

const popoverOf = ({ elements }: Session): HTMLElement | null =>
  queryOne(elements.modes, '.ln-ext-review-engine', HTMLElement);

const part = (session: Session, selector: string): HTMLElement | null =>
  queryOne(popoverOf(session) ?? document.body, selector, HTMLElement);

const press = (target: EventTarget): boolean =>
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

describe('the engine’s popover', () => {
  it('opens under the engine’s button on its click, and closes on the next', async () => {
    const session = review();
    const { graphEngine, modes } = session.elements;
    expect(popoverOf(session)).toBeNull();
    vi.spyOn(modes, 'getBoundingClientRect').mockReturnValue(
      rectBetween({ top: 20, right: 420, bottom: 60, left: 0 }),
    );
    vi.spyOn(graphEngine, 'getBoundingClientRect').mockReturnValue(
      rectBetween({ top: 80, right: 400, bottom: 100, left: 360 }),
    );
    graphEngine.click();
    const popover = popoverOf(session);
    expect(session.view.engine).toBe(true);
    expect(popover && isOpen(popover)).toBe(true);
    expect(popover?.style.getPropertyValue('--ln-ext-engine-top')).toBe('86px');
    expect(popover?.style.getPropertyValue('--ln-ext-engine-right')).toBe('20px');
    expect(popover?.style.getPropertyValue('--ln-ext-engine-origin')).toBe('20px');
    expect(graphEngine.getAttribute('aria-expanded')).toBe('true');
    graphEngine.click();
    expect(session.view.engine).toBe(false);
    expect(popover && isOpen(popover)).toBe(false);
    expect(graphEngine.getAttribute('aria-expanded')).toBe('false');
    await flush();
    expect(popover?.hidden).toBe(true);
  });

  it('hangs under the button again when opened as it closes', () => {
    const session = review();
    const { graphEngine, modes } = session.elements;
    vi.spyOn(modes, 'getBoundingClientRect').mockReturnValue(
      rectBetween({ top: 20, right: 420, bottom: 60, left: 0 }),
    );
    const button = vi.spyOn(graphEngine, 'getBoundingClientRect');
    button.mockReturnValue(rectBetween({ top: 80, right: 400, bottom: 100, left: 360 }));
    graphEngine.click();
    graphEngine.click();
    // Still fading out: the graph's corner moved meanwhile.
    button.mockReturnValue(rectBetween({ top: 120, right: 400, bottom: 140, left: 360 }));
    graphEngine.click();
    expect(popoverOf(session)?.style.getPropertyValue('--ln-ext-engine-top')).toBe('126px');
  });

  it('closes on Escape, and on a press outside it, not on one inside or on its button', () => {
    const session = review();
    const { graphEngine } = session.elements;
    graphEngine.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(session.view.engine).toBe(false);
    graphEngine.click();
    const inside = part(session, '.ln-ext-engine__head');
    if (inside) press(inside);
    press(graphEngine);
    expect(session.view.engine).toBe(true);
    press(document.body);
    expect(session.view.engine).toBe(false);
    expect(queryAll(session.elements.modes, '.ln-ext-review-engine', HTMLElement)).toHaveLength(1);
  });

  it('says the game is analysed as the settings ask, and offers more once they ask for it', () => {
    const session = review();
    session.elements.graphEngine.click();
    expect(part(session, '[data-ln-ext-bind="analysed"]')?.textContent).toBe(
      'Analysed at depth 16 · light',
    );
    expect(part(session, '[data-ln-ext-when="same"]')?.hidden).toBe(false);
    expect(part(session, '[data-ln-ext-when="raise"]')?.hidden).toBe(true);
    part(session, '[data-ln-ext-act="depth:20"]')?.click();
    const reanalyse = part(session, '[data-ln-ext-when="raise"]');
    expect(reanalyse?.hidden).toBe(false);
    expect(reanalyse?.textContent).toContain('Analyse again at depth 20');
    // The button follows the pick.
    expect(session.elements.graphEngine.querySelector('b')?.textContent).toBe('20');
  });

  it('shows the run going on, a square per position', () => {
    const session = review();
    const { work } = session;
    work.analysed = null;
    work.deep.length = 17;
    work.pending.add(17);
    session.elements.graphEngine.click();
    expect(part(session, '[data-ln-ext-when="running"]')?.hidden).toBe(false);
    expect(part(session, '[data-ln-ext-bind="percent"]')?.textContent).toBe('50');
    const squares = queryAll(
      popoverOf(session) ?? document.body,
      '[data-ln-ext-grid] i',
      HTMLElement,
    );
    expect(squares.map(square => square.dataset.lnExtState).slice(15, 19)).toEqual([
      'engine',
      'engine',
      'busy',
      'todo',
    ]);
    expect(squares).toHaveLength(34);
  });

  it('takes the engine button’s tip away as it opens, and leaves another’s', async () => {
    const session = review();
    const { graphEngine, tip } = session.elements;
    showTip(session, graphEngine);
    graphEngine.click();
    expect(tip.isConnected).toBe(false);
    expect(session.tipFor).toBeNull();
    graphEngine.click();
    await flush();
    const other = document.createElement('button');
    other.dataset.lnExtTip = 'Share';
    session.elements.modes.append(other);
    showTip(session, other);
    graphEngine.click();
    expect(tip.isConnected).toBe(true);
    expect(session.tipFor).toBe(other);
  });
});
