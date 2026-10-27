import { beforeEach, describe, expect, it } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { boardZoom } from './board-zoom.ts';
// What the original script did from the same storage and the same drags.
import legacy from './fixtures/legacy-zoom.json' with { type: 'json' };

const root = document.documentElement;

function zoomState(): { zoom: string; stored: string | null; bodyZoom: string } {
  return {
    zoom: root.style.getPropertyValue('--ln-ext-zoom'),
    stored: localStorage.getItem('ln-ext-board-zoom'),
    bodyZoom: document.body.style.getPropertyValue('---zoom'),
  };
}

async function setBodyZoom(value: string): Promise<void> {
  document.body.style.setProperty('---zoom', value);
  await flush();
}

async function press(selector: string, type: string): Promise<void> {
  document.querySelector(selector)?.dispatchEvent(new Event(type, { bubbles: true }));
  await flush();
}

async function release(type: string): Promise<void> {
  document.dispatchEvent(new Event(type, { bubbles: true }));
  await flush();
}

beforeEach(() => {
  root.removeAttribute('style');
  document.body.removeAttribute('style');
  localStorage.clear();
});

describe('boardZoom', () => {
  it.each(legacy.initial)('starts from a stored $stored as the original', ({ stored, zoom }) => {
    if (stored !== null) localStorage.setItem('ln-ext-board-zoom', stored);
    boardZoom.start();
    expect(root.style.getPropertyValue('--ln-ext-zoom')).toBe(zoom);
  });

  it('ignores a stored value that isn’t a number (the original wrote NaN)', () => {
    localStorage.setItem('ln-ext-board-zoom', 'abc');
    boardZoom.start();
    expect(root.style.getPropertyValue('--ln-ext-zoom')).toBe('');
  });

  it('follows a drag on the handle as the original did', async () => {
    localStorage.setItem('ln-ext-board-zoom', '80');
    document.body.innerHTML =
      '<div class="main-board"><div class="cg-wrap"><cg-container><cg-resize><span class="grip"></span></cg-resize></cg-container></div></div><div class="other"></div>';
    boardZoom.start();
    let resizes = 0;
    const onResize = (): void => {
      resizes++;
    };
    window.addEventListener('resize', onResize);
    const steps: unknown[] = [];
    const record = (step: string): void => {
      steps.push({ step, ...zoomState(), resizes });
    };

    record('loaded');
    await press('.other', 'mousedown');
    record('mousedown elsewhere');
    await setBodyZoom('60');
    record('zoom set without a drag');
    await press('.grip', 'mousedown');
    record('mousedown on the handle');
    await press('.grip', 'mousedown');
    record('second mousedown while dragging');
    await setBodyZoom('70');
    record('dragged to 70');
    await setBodyZoom('55.7');
    record('dragged to 55.7');
    await setBodyZoom('abc');
    record('dragged to abc');
    await setBodyZoom('100');
    record('dragged to 100');
    await setBodyZoom('-3');
    record('dragged to -3');
    document.body.style.setProperty('color', 'red');
    await flush();
    record('other body style');
    await release('mouseup');
    await setBodyZoom('40');
    record('after mouseup');
    await press('cg-resize', 'touchstart');
    record('touchstart on the handle');
    await release('mouseup');
    await setBodyZoom('45');
    record('mouseup does not end a touch');
    await release('touchend');
    await setBodyZoom('50');
    record('after touchend');
    root.style.removeProperty('--ln-ext-zoom');
    await press('.grip', 'mousedown');
    record('a drag from full size');
    await release('mouseup');
    window.removeEventListener('resize', onResize);

    expect(steps).toEqual(legacy.steps);
  });

  // lila's ui/dasher/src/board.ts sets the zoom in the slider's own handlers.
  it.each(['input', 'wheel'])('follows the user menu’s Size slider, moved by %s', async type => {
    document.body.innerHTML =
      '<div id="dasher_app"><div class="sub board d2"><div class="zoom"><label>Size</label>' +
      '<input class="range" type="range" min="0" max="100"></div></div></div>';
    boardZoom.start();
    const slider = document.querySelector('.zoom input');
    slider?.addEventListener(type, () => document.body.style.setProperty('---zoom', '64'));
    let resizes = 0;
    const onResize = (): void => {
      resizes++;
    };
    window.addEventListener('resize', onResize);
    slider?.dispatchEvent(new Event(type, { bubbles: true }));
    await flush();
    window.removeEventListener('resize', onResize);
    expect(zoomState()).toEqual({ zoom: '64', stored: '64', bodyZoom: '64' });
    expect(resizes).toBe(1);
  });

  it('ignores another input’s events', async () => {
    document.body.innerHTML = '<div id="dasher_app"><input class="other" type="range"></div>';
    boardZoom.start();
    document.body.style.setProperty('---zoom', '64');
    document.querySelector('.other')?.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(zoomState().zoom).toBe('');
  });

  it('ends a touch drag the browser cancels', async () => {
    document.body.innerHTML = '<cg-resize></cg-resize>';
    boardZoom.start();
    await press('cg-resize', 'touchstart');
    await release('touchcancel');
    await setBodyZoom('40');
    expect(zoomState().zoom).toBe('');
    // The next drag starts afresh.
    await press('cg-resize', 'touchstart');
    await setBodyZoom('45');
    expect(zoomState().zoom).toBe('45');
    await release('touchend');
  });
});
