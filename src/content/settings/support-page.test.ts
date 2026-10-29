import { beforeEach, describe, expect, it, vi } from 'vitest';
import { keepCoach, NO_COACH } from '#shared/coach.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { buildSupportPage, reviewStores } from './support-page.ts';

const spots = vi.hoisted(() => {
  const synced: (HTMLElement | null)[] = [];
  return { synced };
});

// The mascots' bundle isn't loaded here: what the page asks of its spot is what counts.
vi.mock('#content/coach/spot.ts', () => ({
  MascotSpot: class {
    sync(holder: HTMLElement | null): void {
      spots.synced.push(holder);
    }
  },
}));

const CHROME_REVIEWS =
  'https://chromewebstore.google.com/detail/diklhheikbkkodchopfhidgjkdjdjpla/reviews';
const FIREFOX_PAGE = 'https://addons.mozilla.org/firefox/addon/lichess-neo/';

const stubBrowser = (base: string): void => {
  vi.stubGlobal('chrome', {
    i18n: {
      getMessage: (name: string, substitutions: string[] = []) =>
        [name, ...substitutions].join(' '),
    },
    runtime: { id: 'test', getURL: (path: string) => `${base}${path}` },
  });
};

const hrefs = (page: HTMLElement, selector: string): (string | null)[] =>
  queryAll(page, selector, HTMLAnchorElement).map(link => link.getAttribute('href'));

beforeEach(() => {
  localStorage.clear();
  spots.synced.length = 0;
  stubBrowser('chrome-extension://test/');
});

describe('the settings’ Support page', () => {
  it('asks for a star on GitHub first, then a review on the Chrome Web Store', () => {
    const { element } = buildSupportPage();
    expect(hrefs(element, '.ln-ext-support__card > .button')).toEqual([
      'https://github.com/theophile-wallez/LichessNeo',
      CHROME_REVIEWS,
    ]);
    expect(queryOne(element, "[data-ln-ext-support='review'] h2", HTMLElement)?.textContent).toBe(
      'supportReviewTitle Chrome Web Store',
    );
    expect(hrefs(element, '.ln-ext-support__other')).toEqual([FIREFOX_PAGE]);
  });

  it('leads to Firefox Add-ons in Firefox, Chrome’s store a quieter link', () => {
    stubBrowser('moz-extension://test/');
    const { element } = buildSupportPage();
    expect(hrefs(element, '.ln-ext-support__card > .button')[1]).toBe(FIREFOX_PAGE);
    expect(hrefs(element, '.ln-ext-support__other')).toEqual([CHROME_REVIEWS]);
  });

  it('opens its links in a new tab', () => {
    const { element } = buildSupportPage();
    for (const link of queryAll(element, 'a', HTMLAnchorElement)) {
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener');
    }
  });

  it('puts the picked coach on the stage while the page shows, under seven stars', () => {
    keepCoach(5);
    const page = buildSupportPage();
    const mascot = queryOne(page.element, '.ln-ext-support__mascot', HTMLElement);
    expect(queryAll(page.element, '.ln-ext-support__star', HTMLElement)).toHaveLength(7);
    page.show(true);
    expect(mascot?.dataset.lnExtAvatarCoach).toBe('5');
    expect(spots.synced).toEqual([mascot]);
    page.show(false);
    expect(spots.synced).toEqual([mascot, null]);
  });

  it('leaves the stars alone on the stage with no coach', () => {
    keepCoach(NO_COACH);
    const page = buildSupportPage();
    page.show(true);
    expect(queryOne(page.element, '.ln-ext-support__mascot', HTMLElement)?.hidden).toBe(true);
    expect(spots.synced).toEqual([null]);
  });
});

describe('the stores to review on', () => {
  it('puts the one the extension came from first', () => {
    expect(reviewStores(false).map(store => store.name)).toEqual([
      'Chrome Web Store',
      'Firefox Add-ons',
    ]);
    expect(reviewStores(true).map(store => store.name)).toEqual([
      'Firefox Add-ons',
      'Chrome Web Store',
    ]);
  });
});
