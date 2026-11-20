import { afterEach, describe, expect, it } from 'vitest';
import { createElement, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { DEFAULT_REVIEW_ENGINE } from '#shared/review-engine/options.ts';
import { pickReviewEngine } from '#page/review/engine/review-engine.ts';
import { judgedGame, newSession } from '#page/review/fixtures/unit-review.ts';
import type { Session } from '#page/review/session.ts';
import { fillGraphButtons, graphButtonSlots, syncEngineButton } from './graph-buttons.ts';

afterEach(() => {
  pickReviewEngine(DEFAULT_REVIEW_ENGINE);
  Reflect.deleteProperty(window, 'site');
});

/** The engine's button over a review `share` done; a whole one without. */
function buttonOf(share?: number): {
  readonly session: Session;
  readonly button: HTMLButtonElement;
} {
  const session = share === undefined ? judgedGame('opera').session : newSession();
  if (share !== undefined) session.view.progress = share;
  syncEngineButton(session);
  return { session, button: session.elements.graphEngine };
}

const ring = (button: HTMLElement): SVGElement | null =>
  queryOne(button, '.ln-ext-graph-engine__ring', SVGElement);

const ringFill = (button: HTMLElement): string | null | undefined =>
  queryOne(button, '.ln-ext-graph-engine__ring circle:last-child', SVGCircleElement)?.getAttribute(
    'stroke-dasharray',
  );

describe('the graph’s engine button', () => {
  it('shows the depth picked in its level’s hue, once the review is whole', () => {
    const { session, button } = buttonOf();
    expect(ring(button)).toBeNull();
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.querySelector('b')?.textContent).toBe('16');
    expect(button.dataset.lnExtHue).toBe('blue');
    expect(button.dataset.lnExtTip).toBe('Debrief analysis');
    expect(button.getAttribute('aria-label')).toBe('Debrief analysis · Depth 16');
    pickReviewEngine({ ...DEFAULT_REVIEW_ENGINE, depth: 20 });
    syncEngineButton(session);
    expect(button.querySelector('b')?.textContent).toBe('20');
    expect(button.dataset.lnExtHue).toBe('purple');
    // A depth of no level's: the user's own.
    pickReviewEngine({ ...DEFAULT_REVIEW_ENGINE, depth: 31 });
    syncEngineButton(session);
    expect(button.dataset.lnExtHue).toBe('orange');
  });

  it('fills a ring while the game is analysed, its share before the depth', () => {
    const { session, button } = buttonOf(0.427);
    expect(ringFill(button)).toBe('42 100');
    expect(button.querySelector('b')?.textContent).toBe('42%');
    expect(button.querySelector('span')?.textContent).toBe('· 16');
    expect(button.getAttribute('aria-label')).toBe('Debrief analysis · 42 % · Depth 16');
    // The ring fills in place.
    const drawn = ring(button);
    session.view.progress = 0.5;
    syncEngineButton(session);
    expect(ring(button)).toBe(drawn);
    expect(ringFill(button)).toBe('50 100');
    expect(button.querySelector('b')?.textContent).toBe('50%');
  });

  it('drops the ring once the analysis failed', () => {
    const { session, button } = buttonOf(0.3);
    session.view.error = 'The engine failed';
    syncEngineButton(session);
    expect(ring(button)).toBeNull();
    expect(button.querySelector('b')?.textContent).toBe('16');
  });

  it('says whether the popover is open', () => {
    const { session, button } = buttonOf();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    session.view.engine = true;
    syncEngineButton(session);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.classList.contains('active')).toBe(true);
  });
});

describe('the graph’s buttons', () => {
  it('take their slots in a panel drawn anew, the same buttons each time', () => {
    const { session, facade } = judgedGame('opera');
    const { graphViews, graphEngine } = session.elements;
    for (let pass = 0; pass < 2; pass++) {
      const root = createElement('div');
      setHtml(root, graphButtonSlots());
      fillGraphButtons(session, facade, root);
      expect([...root.children]).toEqual([graphViews, graphEngine]);
    }
    expect(graphEngine.querySelector('b')?.textContent).toBe('16');
  });
});
