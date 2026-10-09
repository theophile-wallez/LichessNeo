import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadyStateSchema, setReadyState } from '#shared/testing/ready-state.ts';
import { flush } from '#shared/testing/timers.ts';
import { assets } from './assets.ts';
import { coachChoice } from './coach-choice.ts';
import { fontFaces, fonts } from './fonts.ts';
import { reloadIfInjectedLate } from './late-reload.ts';
// What the original script did in the same cases.
import legacy from './fixtures/legacy.json' with { type: 'json' };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  delete document.documentElement.dataset['lrExtCoach'];
});
afterEach(() => setReadyState('complete'));

describe('assets', () => {
  it('tells the page world where the extension’s files are', () => {
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://id/${path}` },
    });
    assets.start();
    expect(document.documentElement.dataset.lrExtAssets).toBe('chrome-extension://id/');
    delete document.documentElement.dataset.lrExtAssets;
  });
});

describe('fonts', () => {
  it('writes the same faces as the original', () => {
    expect(fontFaces()).toBe(legacy.fontFaces);
  });

  // The original added them at DOMContentLoaded; they now come as the body begins, before the
  // first paint, and still after Lichess's.
  it.each(legacy.fonts)('adds them after Lichess’s, page $readyState', async ({ after }) => {
    const body = document.body;
    body.remove();
    document.head.innerHTML = '<style id="lichess">x</style>';
    fonts.start();
    expect(document.head.children).toHaveLength(1);
    document.documentElement.append(body);
    await flush();
    expect(document.head.innerHTML.replace(legacy.fontFaces, '<faces>')).toBe(after);
    document.head.innerHTML = '';
  });
});

describe('coach choice', () => {
  it.each(legacy.coach)(
    'reads $stored (random $random) as the original did',
    ({ stored, random, dataset, storedAfter }) => {
      vi.spyOn(Math, 'random').mockReturnValue(random);
      if (stored !== null) localStorage.setItem('lr-ext-coach', stored);
      coachChoice.start();
      expect(document.documentElement.dataset['lrExtCoach']).toBe(dataset);
      expect(localStorage.getItem('lr-ext-coach')).toBe(storedAfter);
    },
  );
});

describe('late reload', () => {
  it.each(legacy.lateReload)(
    'page $readyState, last reload $stored: as the original',
    ({ readyState, stored, now, reloaded, reloads, storedAfter }) => {
      const reload = vi.fn<() => void>();
      vi.stubGlobal('location', { reload });
      vi.spyOn(Date, 'now').mockReturnValue(now);
      if (stored !== null) sessionStorage.setItem('lr-ext-late-reload', stored);
      setReadyState(ReadyStateSchema.parse(readyState));
      expect(reloadIfInjectedLate()).toBe(reloaded);
      expect(reload).toHaveBeenCalledTimes(reloads);
      expect(sessionStorage.getItem('lr-ext-late-reload')).toBe(storedAfter);
    },
  );
});
