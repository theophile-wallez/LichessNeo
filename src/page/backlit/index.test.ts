import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCustomElement, createElement } from '#shared/dom.ts';
import { nextFakeFrame } from '#shared/testing/timers.ts';
import { renderBoard } from '#shared/testing/boards.ts';
import { backlit } from './index.ts';

const root = document.documentElement;
const canvas = (): Element | null => document.querySelector('cg-container > canvas.ln-ext-backlit');

/** Lets the observers' callbacks run, then the frame they look for a board in. */
// Once, as the page script starts it: it then follows <html>'s attribute.
beforeAll(() => backlit.start());

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  document.body.classList.add('is2d');
});

afterEach(() => {
  delete root.dataset.lnExtBacklit;
  vi.useRealTimers();
  document.body.replaceChildren();
  document.body.classList.remove('is2d');
});

describe('the backlit board', () => {
  it('lights the main board only while a backlit board is shown', async () => {
    renderBoard({ placement: '8/8/8/8/8/8/8/8', orientation: 'white' });
    await nextFakeFrame();
    expect(canvas()).toBeNull();
    root.dataset.lnExtBacklit = 'accent short captures 5.5 9.6';
    await nextFakeFrame();
    expect(canvas()).not.toBeNull();
    delete root.dataset.lnExtBacklit;
    await nextFakeFrame();
    expect(canvas()).toBeNull();
  });

  it('moves to the next board once the one it lit is gone', async () => {
    root.dataset.lnExtBacklit = 'accent short captures 5.5 9.6';
    await nextFakeFrame();
    const first = renderBoard({ placement: '8/8/8/8/8/8/8/8', orientation: 'white' });
    await nextFakeFrame();
    expect(canvas()?.parentElement).toBe(first.parentElement);
    const next = renderBoard({ placement: '8/8/8/8/8/8/8/8', orientation: 'black' });
    await nextFakeFrame();
    expect(canvas()?.parentElement).toBe(next.parentElement);
    expect(document.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('lights the settings’ preview board, which is in no game’s layout', async () => {
    root.dataset.lnExtBacklit = 'sides wide always 2 50';
    const host = createElement('div', { className: 'ln-ext-looks-preview__board' });
    const container = createCustomElement('cg-container');
    container.append(createCustomElement('cg-board'));
    host.append(container);
    document.body.replaceChildren(host);
    await nextFakeFrame();
    expect(canvas()?.parentElement).toBe(container);
  });
});
