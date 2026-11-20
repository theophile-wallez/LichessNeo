import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import type { Session } from '#page/review/session.ts';
import { mountGraph } from './graph.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

/** The opera game's summary graph, in the page. */
function graph(): { readonly session: Session; readonly container: HTMLElement } {
  const { session, facade } = judgedGame('opera');
  const container = document.createElement('div');
  // Its padding is measured: happy-dom has none to give unless set.
  container.style.padding = '4px 8px';
  document.body.append(container);
  mountGraph(session, facade, { container, kind: 'summary' });
  return { session, container };
}

const hover = (container: HTMLElement): void => {
  container.dispatchEvent(new MouseEvent('mousemove', { clientX: 50 }));
};

const tipShown = (container: HTMLElement): boolean =>
  queryOne(container, '.ln-ext-graph-tip', HTMLElement)?.style.display === 'block';

const boardShown = (): boolean => document.querySelector('#ln-ext-graph-board') !== null;

describe('the graph’s hover', () => {
  it('shows the score and a little board of the position under the pointer', () => {
    const { container } = graph();
    hover(container);
    expect(tipShown(container)).toBe(true);
    expect(boardShown()).toBe(true);
  });

  it('shows neither under the engine’s popover, and takes away what it showed', () => {
    const { session, container } = graph();
    hover(container);
    session.view.engine = true;
    hover(container);
    expect(tipShown(container)).toBe(false);
    expect(boardShown()).toBe(false);
    session.view.engine = false;
    hover(container);
    expect(boardShown()).toBe(true);
  });
});
