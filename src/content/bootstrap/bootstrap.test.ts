import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadyStateSchema, setReadyState } from '#shared/testing/ready-state.ts';
import { flush } from '#shared/testing/timers.ts';
import { assets } from './assets.ts';
import { ROBOT_COACH } from '#shared/coach.ts';
import { chooseCoach, coachChoice } from './coach-choice.ts';
import { fontFaces, fonts } from './fonts.ts';
import { reloadIfInjectedLate } from './late-reload.ts';
// What the original script did in the same cases.
import legacy from './fixtures/legacy.json' with { type: 'json' };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  delete document.documentElement.dataset['lnExtCoach'];
});
afterEach(() => setReadyState('complete'));

describe('assets', () => {
  it('tells the page world where the extension’s files are', () => {
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://id/${path}` },
    });
    assets.start();
    expect(document.documentElement.dataset.lnExtAssets).toBe('chrome-extension://id/');
    delete document.documentElement.dataset.lnExtAssets;
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

// The original had four coaches, there are COACH_COUNT now: a stored "5" is one of them. Where
// it drew a coach and kept it, each page now draws its own from when it started, keeping nothing.
// The coach drawn on a page started at 2 ms, the third offered.
const PAGE_COACH = 3;

function nowExpected({ stored, dataset, storedAfter }: (typeof legacy.coach)[number]): {
  readonly dataset: string;
  readonly storedAfter: string | null;
} {
  if (stored === '5') return { dataset: '5', storedAfter: '5' };
  if (storedAfter === stored) return { dataset, storedAfter };
  return { dataset: String(PAGE_COACH), storedAfter: stored };
}

describe('coach choice', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://id/${path}` },
    });
  });

  it.each(legacy.coach)('reads $stored (random $random) as the original did', legacyCase => {
    const { stored, random } = legacyCase;
    const { dataset, storedAfter } = nowExpected(legacyCase);
    vi.spyOn(Math, 'random').mockReturnValue(random);
    vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(PAGE_COACH - 1);
    if (stored !== null) localStorage.setItem('ln-ext-coach', stored);
    coachChoice.start();
    expect(document.documentElement.dataset['lnExtCoach']).toBe(dataset);
    expect(localStorage.getItem('ln-ext-coach')).toBe(storedAfter);
  });

  it('shows the settings’ pick at once and keeps it', () => {
    localStorage.setItem('ln-ext-coach', '2');
    coachChoice.start();
    chooseCoach(ROBOT_COACH);
    expect(document.documentElement.dataset['lnExtCoach']).toBe(String(ROBOT_COACH));
    expect(localStorage.getItem('ln-ext-coach')).toBe(String(ROBOT_COACH));
  });

  it('decodes the coach’s still at once, so a card drawn later shows it in its first frame', () => {
    const decoded: string[] = [];
    vi.spyOn(HTMLImageElement.prototype, 'decode').mockImplementation(function (
      this: HTMLImageElement,
    ) {
      decoded.push(this.src);
      return Promise.resolve();
    });
    localStorage.setItem('ln-ext-coach', '12');
    coachChoice.start();
    chooseCoach(20);
    expect(decoded).toEqual([
      'chrome-extension://id/img/coaches/mascot-12.webp',
      'chrome-extension://id/img/coaches/mascot-20.webp',
    ]);
  });
});

describe('late reload', () => {
  it.each(legacy.lateReload)(
    'page $readyState, last reload $stored: as the original',
    ({ readyState, stored, now, reloaded, reloads, storedAfter }) => {
      const reload = vi.fn<() => void>();
      vi.stubGlobal('location', { reload });
      vi.spyOn(Date, 'now').mockReturnValue(now);
      if (stored !== null) sessionStorage.setItem('ln-ext-late-reload', stored);
      setReadyState(ReadyStateSchema.parse(readyState));
      expect(reloadIfInjectedLate()).toBe(reloaded);
      expect(reload).toHaveBeenCalledTimes(reloads);
      expect(sessionStorage.getItem('ln-ext-late-reload')).toBe(storedAfter);
    },
  );
});
