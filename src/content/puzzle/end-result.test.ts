import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { syncEndResult } from './end-result.ts';

// The extension's own messages (public/_locales/en).
const MESSAGES: Record<string, string> = { puzzleSolved: 'First try', puzzleFailed: 'Missed' };

beforeEach(() => {
  // The numbers' format, read once a page.
  document.documentElement.lang = 'en';
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => MESSAGES[name] ?? '' } });
});

afterEach(() => {
  document.body.innerHTML = '';
});

// The page as Lichess draws it at a puzzle's end: the session's chips, the side card's
// rating ("1511 +12" once rated) and the end card.
function endCard({ chip, rating }: { chip: string; rating: string }): void {
  document.body.innerHTML =
    '<main class="puzzle"><div class="puzzle__side"><div class="puzzle__side__user">' +
    `<div class="puzzle__side__user__rating"><strong>${rating}</strong></div></div></div>` +
    '<div class="puzzle__tools"><div class="puzzle__feedback after">' +
    '<div class="complete">Success!</div><button class="continue">Continue training</button>' +
    '<div class="puzzle__more"></div></div></div>' +
    `<div class="puzzle__session"><a class="result-true"></a>${chip}</div></main>`;
}

function result(): HTMLElement | null {
  return queryOne(document, '.puzzle__feedback.after > .ln-ext-puzzle-result', HTMLElement);
}

const parts = (): string[] =>
  ['verdict', 'diff', 'rating'].map(
    part => result()?.querySelector(`.ln-ext-puzzle-result__${part}`)?.textContent ?? '',
  );

describe('the end card’s result', () => {
  it('says the puzzle was solved first time, with the rating it gave', () => {
    endCard({
      chip: '<a class="result-true current"></a>',
      rating: '1511 <good class="rp">+12</good>',
    });
    syncEndResult();
    expect(parts()).toEqual(['First try', '+12', '1,523']);
    expect(result()?.dataset).toMatchObject({ lnExtVerdict: 'solved', lnExtSign: 'up' });
  });

  it('says it was missed, with the rating it took', () => {
    endCard({
      chip: '<a class="result-false current"></a>',
      rating: '1511 <bad class="rp">−8</bad>',
    });
    syncEndResult();
    expect(parts()).toEqual(['Missed', '-8', '1,503']);
    expect(result()?.dataset).toMatchObject({ lnExtVerdict: 'failed', lnExtSign: 'down' });
  });

  it('shows the verdict alone when the rating doesn’t change', () => {
    endCard({
      chip: '<a class="result-false current result-empty"></a>',
      rating: 'Your puzzle rating will not change.',
    });
    syncEndResult();
    expect(parts()).toEqual(['Missed', '', '']);
    expect(result()?.dataset.lnExtSign).toBeUndefined();
  });

  it('adds nothing with neither a verdict nor a change, nor before the end', () => {
    endCard({ chip: '<a class="current"></a>', rating: '2177' });
    syncEndResult();
    expect(result()).toBeNull();
    endCard({ chip: '<a class="result-true current"></a>', rating: '1511 +12' });
    queryOne(document, '.puzzle__feedback', HTMLElement)?.classList.replace('after', 'play');
    syncEndResult();
    expect(document.querySelector('.ln-ext-puzzle-result')).toBeNull();
  });

  it('keeps one line, and writes only what changes', () => {
    endCard({ chip: '<a class="result-true current"></a>', rating: '1511 +12' });
    syncEndResult();
    const line = result();
    const observer = new MutationObserver(() => {});
    if (line)
      observer.observe(line, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
    syncEndResult();
    expect(observer.takeRecords()).toEqual([]);
    expect(document.querySelectorAll('.ln-ext-puzzle-result')).toHaveLength(1);
    observer.disconnect();
  });
});
