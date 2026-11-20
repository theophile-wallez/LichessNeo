import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from './testing/timers.ts';
import { isOpen, reveal, swapText, togglePopup } from './ui-motion.ts';

// Motion's transforms don't run in happy-dom: each motion here ends when the test says,
// and one stopped never ends, as Motion's own.

interface Motion {
  readonly keyframes: unknown;
  readonly finish: () => void;
  stopped: boolean;
}

const motions = vi.hoisted(() => {
  const started: Motion[] = [];
  return started;
});

vi.mock('motion', () => ({
  animate: (_element: unknown, keyframes: unknown) => {
    const { promise, resolve } = Promise.withResolvers<void>();
    const motion: Motion = { keyframes, finish: () => resolve(), stopped: false };
    motions.push(motion);
    return { finished: promise, stop: () => (motion.stopped = true) };
  },
  frame: { postRender: (callback: () => void) => callback() },
}));

afterEach(() => {
  motions.length = 0;
  document.body.replaceChildren();
});

function part(hidden: boolean): HTMLElement {
  const element = document.createElement('div');
  element.hidden = hidden;
  document.body.append(element);
  return element;
}

/** Ends the motion started `index`th, and what waited on it. */
async function finish(index: number): Promise<void> {
  motions[index]?.finish();
  await flush();
}

describe('swapText', () => {
  it('sets the text at once when asked, or out of the document', () => {
    const shown = part(false);
    swapText(shown, '16', { instant: true });
    const detached = document.createElement('span');
    swapText(detached, '20');
    expect([shown.textContent, detached.textContent]).toEqual(['16', '20']);
    expect(motions).toHaveLength(0);
  });

  it('slides the old text out the way the value went, then the new one in', async () => {
    const element = part(false);
    element.textContent = '17';
    swapText(element, '16', { direction: -1, distance: 4 });
    expect(element.textContent).toBe('17');
    expect(motions[0]?.keyframes).toEqual({ opacity: 0, y: 4 });
    await finish(0);
    expect(element.textContent).toBe('16');
    expect(motions[1]?.keyframes).toEqual({ opacity: [0, 1], y: [-4, 0] });
  });

  it('ends on the last text asked for', async () => {
    const element = part(false);
    element.textContent = '16';
    swapText(element, '17');
    swapText(element, '18');
    expect(motions[0]?.stopped).toBe(true);
    await finish(1);
    await finish(0);
    expect(element.textContent).toBe('18');
    swapText(element, '19');
    swapText(element, '20', { instant: true });
    await finish(2);
    expect(element.textContent).toBe('20');
  });
});

describe('reveal', () => {
  it('shows and hides at once when asked', () => {
    const element = part(true);
    reveal(element, true, 'height', true);
    expect(element.hidden).toBe(false);
    reveal(element, false, 'fade', true);
    expect(element.hidden).toBe(true);
    expect(motions).toHaveLength(0);
  });

  it('grows a part from nothing, and lets it take its own height after', async () => {
    const element = part(true);
    reveal(element, true, 'height');
    expect(element.hidden).toBe(false);
    expect(motions[0]?.keyframes).toMatchObject({ height: [0, element.scrollHeight] });
    element.style.height = '40px';
    await finish(0);
    expect(element.style.height).toBe('');
  });

  it('hides a part once it has gone, counting it gone meanwhile', async () => {
    const element = part(false);
    reveal(element, false, 'fade');
    expect(element.hidden).toBe(false);
    expect(isOpen(element)).toBe(false);
    reveal(element, false, 'fade');
    expect(motions).toHaveLength(1);
    await finish(0);
    expect(element.hidden).toBe(true);
  });

  it('keeps a part shown again as it left', async () => {
    const element = part(false);
    reveal(element, false, 'height');
    reveal(element, true, 'height');
    await finish(0);
    await finish(1);
    expect(element.hidden).toBe(false);
    expect(isOpen(element)).toBe(true);
  });
});

describe('togglePopup', () => {
  it('opens at once, and closes once its exit ends', async () => {
    const popup = part(true);
    togglePopup(popup, true);
    expect(isOpen(popup)).toBe(true);
    togglePopup(popup, false);
    expect(isOpen(popup)).toBe(false);
    expect(popup.hidden).toBe(false);
    await finish(1);
    expect(popup.hidden).toBe(true);
  });

  it('stays open when opened again as it closes', async () => {
    const popup = part(false);
    togglePopup(popup, false);
    togglePopup(popup, true);
    await finish(0);
    expect(popup.hidden).toBe(false);
  });
});
