import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { trackListeners } from '#shared/testing/listeners.ts';
import { practiceHref, syncOpeningPractice } from './opening-practice.ts';

// An opening's page as Lichess serves it: its intro, with the links to its
// line on the free board, the explorer open, and to its Wikipedia article.
const PAGE = `<main class="opening"><div class="opening__intro">
  <a class="button text" href="/analysis/pgn/e4_c5#explorer">View in opening explorer</a>
  <a class="button text" href="https://en.wikipedia.org/wiki/Sicilian_Defence">Wikipedia</a>
</div></main>`;

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => `[${name}]` } });
});

afterEach(() => {
  document.body.replaceChildren();
});

const links = (): HTMLAnchorElement[] => queryAll(document, '.opening__intro a', HTMLAnchorElement);

describe('the practice link’s address', () => {
  it('is the explorer’s line on the practice page', () => {
    expect(practiceHref('/analysis/pgn/e4_c5#explorer')).toBe(
      '/analysis/pgn/e4_c5#ln-ext-practice',
    );
    expect(practiceHref('/analysis/pgn/d4')).toBe('/analysis/pgn/d4#ln-ext-practice');
  });

  it('is none for a link off the free board', () => {
    expect(practiceHref('/opening/Sicilian_Defense#explorer')).toBeNull();
  });
});

describe('an opening’s page', () => {
  it('links to practice its line, right after the explorer’s link', () => {
    document.body.innerHTML = PAGE;
    syncOpeningPractice();
    expect(links().map(link => link.getAttribute('href'))).toEqual([
      '/analysis/pgn/e4_c5#explorer',
      '/analysis/pgn/e4_c5#ln-ext-practice',
      'https://en.wikipedia.org/wiki/Sicilian_Defence',
    ]);
    const practice = links()[1];
    expect(practice?.className).toBe('button text ln-ext-opening-practice');
    expect(practice?.textContent).toBe('[openingPractice]');
    expect(practice?.querySelector('svg')).not.toBeNull();
  });

  it('adds it once, and follows the explorer’s line as Lichess changes it', () => {
    document.body.innerHTML = PAGE;
    syncOpeningPractice();
    syncOpeningPractice();
    expect(links()).toHaveLength(3);
    queryOne(document, "a[href$='#explorer']", HTMLAnchorElement)?.setAttribute(
      'href',
      '/analysis/pgn/e4_c5_Nf3#explorer',
    );
    syncOpeningPractice();
    expect(links()[1]?.getAttribute('href')).toBe('/analysis/pgn/e4_c5_Nf3#ln-ext-practice');
  });

  it('adds nothing to another page', () => {
    document.body.innerHTML = PAGE.replace('main class="opening"', 'main class="page"');
    syncOpeningPractice();
    expect(links()).toHaveLength(2);
  });
});

/** Starts the feature and the sync loop as a build with `LN_EXT_DEV_BUILD` set so would. */
async function startFor(devBuild: boolean): Promise<void> {
  vi.stubGlobal('LN_EXT_DEV_BUILD', devBuild);
  vi.resetModules();
  const { openingPractice } = await import('./opening-practice.ts');
  const { startSyncLoop } = await import('#content/sync-loop.ts');
  openingPractice.start();
  startSyncLoop();
}

let removeListeners = (): void => {};

describe('a release build', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    removeListeners = trackListeners(document, window);
  });
  afterEach(() => {
    removeListeners();
    vi.useRealTimers();
  });

  it('links to nothing until the page is finished, which a dev build does', async () => {
    document.body.innerHTML = PAGE;
    await startFor(false);
    expect(links()).toHaveLength(2);
    await startFor(true);
    expect(links()).toHaveLength(3);
  });
});
