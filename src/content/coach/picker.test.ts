import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { openCoachPicker } from './picker.ts';

// The picker names its messages as it's built.
const i18n = { getMessage: (name: string): string => name };
// Picking a coach decodes its still (bootstrap/coach-choice.ts).
const runtime = { getURL: (path: string): string => `chrome-extension://id/${path}` };

let posted: unknown[] = [];

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n, runtime });
  posted = [];
  vi.spyOn(window, 'postMessage').mockImplementation((data: unknown) => posted.push(data));
});

afterEach(() => {
  queryOne(document, 'dialog', HTMLDialogElement)?.close();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const dialog = (): HTMLDialogElement => {
  const found = queryOne(document, 'dialog.lr-ext-coach-picker', HTMLDialogElement);
  if (!found) throw new Error('no picker');
  return found;
};

const tile = (coach: number): HTMLElement | null =>
  queryOne(dialog(), `[data-lr-ext-coach-choice="${coach}"]`, HTMLElement);

describe('the coach picker', () => {
  it('opens over the page with every coach, the one shown pressed and focused', () => {
    openCoachPicker(3);
    expect(dialog().open).toBe(true);
    expect(dialog().getAttribute('aria-labelledby')).toBe('lr-ext-coach-picker-title');
    expect(queryAll(dialog(), '.lr-ext-coach-choice', HTMLElement)).toHaveLength(26);
    const pressed = queryAll(dialog(), '[aria-pressed="true"]', HTMLElement);
    expect(pressed.map(each => each.dataset.lrExtCoachChoice)).toEqual(['3']);
    expect(document.activeElement).toBe(tile(3));
  });

  it('keeps the coach picked, tells the page and closes', () => {
    openCoachPicker(3);
    tile(5)?.click();
    expect(localStorage.getItem('lr-ext-coach')).toBe('5');
    expect(document.documentElement.dataset.lrExtCoach).toBe('5');
    expect(posted).toEqual([{ type: 'lr-ext:coach-picked', coach: 5 }]);
    expect(dialog().open).toBe(false);
  });

  it('closes on its close button or its backdrop, not on its card, the coach as it was', () => {
    openCoachPicker(2);
    queryOne(dialog(), '.lr-ext-coach-picker__card', HTMLElement)?.click();
    expect(dialog().open).toBe(true);
    queryOne(dialog(), '.lr-ext-coach-picker__close', HTMLElement)?.click();
    expect(dialog().open).toBe(false);
    openCoachPicker(2);
    dialog().click();
    expect(dialog().open).toBe(false);
    expect(posted).toEqual([]);
    expect(localStorage.getItem('lr-ext-coach')).toBeNull();
  });

  it('opens on the coach shown now, the next time', () => {
    openCoachPicker(2);
    tile(7)?.click();
    openCoachPicker(7);
    const pressed = queryAll(dialog(), '[aria-pressed="true"]', HTMLElement);
    expect(pressed.map(each => each.dataset.lrExtCoachChoice)).toEqual(['7']);
    expect(queryAll(document, 'dialog.lr-ext-coach-picker', HTMLElement)).toHaveLength(1);
  });
});
