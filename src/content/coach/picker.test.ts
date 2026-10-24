import ShuffleIcon from '@hugeicons/core-free-icons/ShuffleIcon';
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
  const found = queryOne(document, 'dialog.ln-ext-coach-picker', HTMLDialogElement);
  if (!found) throw new Error('no picker');
  return found;
};

// Opens the picker with `coach` kept, as the review's click does.
const open = (coach: number | string): void => {
  localStorage.setItem('ln-ext-coach', String(coach));
  openCoachPicker();
};

const tile = (coach: number | string): HTMLElement | null =>
  queryOne(dialog(), `[data-ln-ext-coach-choice="${coach}"]`, HTMLElement);

describe('the coach picker', () => {
  it('opens over the page with every coach offered, the one shown pressed and focused', () => {
    open(3);
    expect(dialog().open).toBe(true);
    expect(dialog().getAttribute('aria-labelledby')).toBe('ln-ext-coach-picker-title');
    expect(queryAll(dialog(), '.ln-ext-coach-choice', HTMLElement)).toHaveLength(27);
    const pressed = queryAll(dialog(), '[aria-pressed="true"]', HTMLElement);
    expect(pressed.map(each => each.dataset.lnExtCoachChoice)).toEqual(['3']);
    expect(document.activeElement).toBe(tile(3));
  });

  it('keeps the coach picked, tells the page and closes', () => {
    open(3);
    tile(5)?.click();
    expect(localStorage.getItem('ln-ext-coach')).toBe('5');
    expect(document.documentElement.dataset.lnExtCoach).toBe('5');
    expect(posted).toEqual([{ type: 'ln-ext:coach-picked', coach: 5 }]);
    expect(dialog().open).toBe(false);
  });

  it('starts with no coach and one at random', () => {
    open(3);
    const choices = queryAll(dialog(), '.ln-ext-coach-choice', HTMLElement);
    expect(choices.slice(0, 3).map(each => each.dataset.lnExtCoachChoice)).toEqual([
      'none',
      'random',
      '1',
    ]);
  });

  it('draws a shuffle on the random tile', () => {
    open(3);
    const paths = queryAll(tile('random') ?? dialog(), 'svg path', SVGPathElement);
    expect(paths.map(path => path.getAttribute('d'))).toEqual(
      ShuffleIcon.map(([, attributes]) => attributes.d),
    );
  });

  it('takes the coach away for none, with nothing to tell the page', () => {
    open(3);
    tile('none')?.click();
    expect(localStorage.getItem('ln-ext-coach')).toBe('none');
    expect(document.documentElement.dataset.lnExtCoach).toBe('none');
    expect(posted).toEqual([]);
    expect(dialog().open).toBe(false);
  });

  it('keeps one at random, and tells the page the one it drew', () => {
    vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(4);
    open(3);
    tile('random')?.click();
    expect(localStorage.getItem('ln-ext-coach')).toBe('random');
    expect(posted).toEqual([{ type: 'ln-ext:coach-picked', coach: 5 }]);
    open('random');
    const pressed = queryAll(dialog(), '[aria-pressed="true"]', HTMLElement);
    expect(pressed.map(each => each.dataset.lnExtCoachChoice)).toEqual(['random']);
  });

  it('closes on its close button or its backdrop, not on its card, the coach as it was', () => {
    open(2);
    queryOne(dialog(), '.ln-ext-coach-picker__card', HTMLElement)?.click();
    expect(dialog().open).toBe(true);
    queryOne(dialog(), '.ln-ext-coach-picker__close', HTMLElement)?.click();
    expect(dialog().open).toBe(false);
    open(2);
    dialog().click();
    expect(dialog().open).toBe(false);
    expect(posted).toEqual([]);
    expect(localStorage.getItem('ln-ext-coach')).toBe('2');
  });

  it('opens on the coach shown now, the next time', () => {
    open(2);
    tile(7)?.click();
    open(7);
    const pressed = queryAll(dialog(), '[aria-pressed="true"]', HTMLElement);
    expect(pressed.map(each => each.dataset.lnExtCoachChoice)).toEqual(['7']);
    expect(queryAll(document, 'dialog.ln-ext-coach-picker', HTMLElement)).toHaveLength(1);
  });
});
