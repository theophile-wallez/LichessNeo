import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { createLibrary } from './library.ts';
import { FAMILY_ROWS, OPTION_ROWS, onBacklitChange, readBacklit } from './options.ts';

const sliders = (): HTMLInputElement[] =>
  (FAMILY_ROWS.backlit ?? []).flatMap(row =>
    queryAll(row(), 'input[type="range"]', HTMLInputElement),
  );

afterEach(() => {
  localStorage.clear();
});

describe('the backlit boards’ settings', () => {
  it('read as the defaults, keys in their usual shape, until the user picks', () => {
    expect(readBacklit()).toEqual({
      light: 'accent',
      reach: 'short',
      waves: 'captures',
      shape: { gap: 5.5, radius: 9.6 },
    });
  });

  it('read the keys’ shape picked, and the default for a value out of range', () => {
    localStorage.setItem('lr-ext-backlit-gap', '0');
    localStorage.setItem('lr-ext-backlit-radius', '50');
    expect(readBacklit().shape).toEqual({ gap: 0, radius: 50 });
    localStorage.setItem('lr-ext-backlit-gap', '17');
    localStorage.setItem('lr-ext-backlit-radius', '-1');
    expect(readBacklit().shape).toEqual({ gap: 5.5, radius: 9.6 });
  });

  it('slide the gap and the corners through their ranges, and tell the boards', () => {
    const changed = vi.fn<() => void>();
    onBacklitChange(changed);
    const [gap, corners] = sliders();
    if (!gap || !corners) throw new Error('no sliders');
    expect([gap.max, gap.step, corners.max, corners.step]).toEqual(['16', '0.5', '50', '0.2']);
    corners.value = '30';
    corners.dispatchEvent(new Event('input'));
    expect(readBacklit().shape).toEqual({ gap: 5.5, radius: 30 });
    expect(changed).toHaveBeenCalledOnce();
  });
});

describe('the board panel’s rows', () => {
  it('color the custom board and save it, shown while it’s picked', () => {
    const library = createLibrary({
      readPicked: () => Promise.resolve([]),
      readAll: () => Promise.resolve([]),
      save: () => Promise.resolve(),
      erase: () => Promise.resolve(),
      show: () => undefined,
    });
    const rows = OPTION_ROWS.board.map(row => row(library));
    expect(rows.map(row => row.firstElementChild?.textContent)).toEqual([
      'Light squares',
      'Dark squares',
      'Save as',
    ]);
    expect(rows.map(row => row.dataset.lrExtFor)).toEqual(['custom', 'custom', 'custom']);
  });
});
