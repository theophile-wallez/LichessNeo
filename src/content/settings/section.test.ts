import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { flush } from '#shared/testing/timers.ts';
import { buildSection } from './section.ts';

// IndexedDB isn't in happy-dom, nor WebGL: the packs' store and the mascots' bundle are mocked.
vi.mock('#content/packs/store.ts', () => ({
  readPack: vi.fn<(id: string) => Promise<Pack | null>>(() => Promise.resolve(null)),
  readPacks: vi.fn<() => Promise<Pack[]>>(() => Promise.resolve([])),
  writePack: vi.fn<(pack: Pack) => Promise<void>>(() => Promise.resolve()),
  deletePack: vi.fn<(id: string) => Promise<void>>(() => Promise.resolve()),
}));
vi.mock('#content/coach/load.ts', () => ({
  coachesMove: () => true,
  loadMascots: () => Promise.resolve(null),
  onCoachMotion: () => () => {},
}));

// The cards' markup names its messages as their modules load.
const i18n = vi.hoisted(() => {
  const messages = { getMessage: (name: string): string => name };
  vi.stubGlobal('chrome', { i18n: messages });
  return messages;
});

// The synced storage answers when the test says so.
const answers: (() => void)[] = [];

beforeEach(() => {
  vi.stubGlobal('chrome', {
    i18n,
    runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test/${path}` },
    storage: {
      sync: {
        get: (key: string) =>
          new Promise(resolve => {
            answers.push(() => resolve({ [key]: undefined }));
          }),
        set: () => Promise.resolve(),
      },
      onChanged: { addListener: () => {} },
    },
  });
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => setTimeout(callback, 0));
  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

const visiblePages = (element: HTMLElement): (string | undefined)[] =>
  queryAll(element, '.ln-ext-settings__page', HTMLElement)
    .filter(page => !page.hidden)
    .map(page => page.dataset.lnExtPage);

const title = (element: HTMLElement): string | null | undefined =>
  queryOne(element, 'h1.box__top', HTMLElement)?.textContent;

const pageHolds = (element: HTMLElement, page: string, selector: string): boolean =>
  queryOne(element, `[data-ln-ext-page='${page}'] ${selector}`, HTMLElement) !== null;

describe('the settings’ section', () => {
  it('holds each page’s cards in its own panel', () => {
    const { element } = buildSection();
    const holds: Readonly<Record<string, readonly string[]>> = {
      appearance: [
        '.ln-ext-nav-picks',
        '.ln-ext-appearance',
        "[data-ln-ext-setting='roundness']",
        "[data-ln-ext-setting='uiSounds']",
      ],
      board: ['.ln-ext-looks-page', '.ln-ext-packs'],
      coach: ['.ln-ext-coach-pick', "[data-ln-ext-setting='coachMotion']"],
      analysis: ["[data-ln-ext-setting='classStyle']", "[data-ln-ext-setting='analysisCoach']"],
      play: ["[data-ln-ext-setting='gameIntro']", '.ln-ext-pairing'],
      profile: [
        '.ln-ext-avatar-pick:not(.ln-ext-name-pick)',
        '.ln-ext-name-pick',
        "[data-ln-ext-setting='sidebarRating']",
        "[data-ln-ext-setting='chesscomRating']",
        "[data-ln-ext-setting='ratingStakes']",
      ],
    };
    for (const [page, selectors] of Object.entries(holds))
      for (const selector of selectors)
        expect(pageHolds(element, page, selector), `${page} ${selector}`).toBe(true);
    expect(pageHolds(element, 'board', "[data-ln-ext-setting='uiSounds']")).toBe(false);
    expect(pageHolds(element, 'profile', '.ln-ext-coach-pick')).toBe(false);
  });

  it('shows one page at a time, under its name', () => {
    const section = buildSection();
    expect(visiblePages(section.element)).toEqual([]);
    section.show('board');
    expect(visiblePages(section.element)).toEqual(['board']);
    expect(title(section.element)).toBe('settingsPageBoard');
    expect(section.element.dataset.lnExtPage).toBe('board');
    section.show('profile');
    expect(visiblePages(section.element)).toEqual(['profile']);
    expect(title(section.element)).toBe('settingsPageProfile');
    section.show(null);
    expect(visiblePages(section.element)).toEqual([]);
    expect(title(section.element)).toBe('');
    expect(section.element.dataset.lnExtPage).toBeUndefined();
  });

  it('brings the coach in only while its page shows', () => {
    const section = buildSection();
    document.body.append(section.element);
    const live = (): boolean =>
      pageHolds(section.element, 'coach', '.ln-ext-coach-pick__mascot .ln-ext-mascot');
    section.show('coach');
    expect(live()).toBe(true);
    section.show('play');
    expect(live()).toBe(false);
  });

  it('marks its switches pending until the stored settings are read', async () => {
    const { element } = buildSection();
    expect(element.dataset.lnExtPending).toBe('');
    for (const answer of answers.splice(0)) answer();
    await flush();
    expect(element.dataset.lnExtPending).toBeUndefined();
  });
});
