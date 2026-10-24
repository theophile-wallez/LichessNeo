import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import fixture from './fixtures/perf-stat.json' with { type: 'json' };
import { syncPerfStat } from './index.ts';

const PAGE = fixture.html;

const WORST = `<div><table><thead><tr><th colspan="2"><h2>Worst rated defeats</h2></th></tr></thead><tbody>
  <tr><td><a class="user-link ulpt" href="/@/serega1979">serega1979</a> (1770)</td><td><a class="glpt" href="/game/U8wY7ss2?pov=Lance5500"><time class="abs" datetime="2018-05-19T01:12:16.331Z">May 19, 2018</time></a></td></tr>
</tbody></table></div>`;

const texts = (selector: string): string[] =>
  queryAll(document, selector, HTMLElement).map(element => element.textContent.trim());

function found(selector: string): HTMLElement {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return element;
}

beforeEach(() => {
  document.documentElement.lang = 'en-US';
  document.body.innerHTML = `<main class="page-menu">${PAGE}</main>`;
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.lang = '';
});

describe("a rating's stats page as cards", () => {
  it('puts the rating’s cards above the chart and the rest at the head of the content', () => {
    syncPerfStat();
    expect(found('.perf-stat > .box__top').nextElementSibling).toBe(found('.ln-ext-perf--hero'));
    expect(found('.ln-ext-perf--hero').nextElementSibling).toBe(
      found('.perf-stat > .rating-history-container'),
    );
    expect(found('.perf-stat__content').firstElementChild).toBe(found('.ln-ext-perf--body'));
    // Lichess's sections stay, for the stylesheet to hide.
    expect(found('.perf-stat__content').dataset.lnExtPerf).toBe('');
    expect(queryAll(document, '.perf-stat__content > section', HTMLElement)).toHaveLength(7);
  });

  it('shows the rating, its progress and deviation, its percentile and its range', () => {
    syncPerfStat();
    expect(texts('.ln-ext-perf__rating')).toEqual(['2460']);
    expect(texts('.ln-ext-perf__chip')).toEqual(['+3', '± 59']);
    expect(found('.ln-ext-perf__chip').title).toBe('Progression over the last 12 games');
    expect(texts('.ln-ext-perf__ring b')).toEqual(['99.9%']);
    const arc = queryOne(document, '.ln-ext-perf__ring circle + circle', SVGCircleElement);
    expect(arc?.getAttribute('stroke-dasharray')).toBe('99.9 100');
    // 2460 between 2052 and 2622.
    expect(found('.ln-ext-perf__bar').style.getPropertyValue('--ln-ext-perf-at')).toBe('71.6%');
    expect(texts('.ln-ext-perf__end > span')).toEqual(['Lowest rating', 'Highest rating']);
    expect(texts('.ln-ext-perf__end > a')).toEqual(['May 19, 2018', 'Oct 16, 2017']);
  });

  it('shows the results on one bar, and a card for each count of games', () => {
    syncPerfStat();
    expect(texts('.ln-ext-perf__results h3')).toEqual(['Total games3,201']);
    expect(
      queryAll(document, '.ln-ext-perf__split > i', HTMLElement).map(bar => bar.style.flexGrow),
    ).toEqual(['2328', '468', '405']);
    expect(texts('.ln-ext-perf__result b')).toEqual(['2,328', '468', '405']);
    expect(texts('.ln-ext-perf__foot > span')).toEqual([
      'Average opponent 1826',
      'Disconnections 4 (0%)',
    ]);
    expect(texts('.ln-ext-perf__count > div > span')).toEqual([
      'Rated games',
      'Tournament games',
      'Berserked games',
      'Time spent playing',
    ]);
  });

  it('shows each streak’s record, its days, and the streak going on', () => {
    syncPerfStat();
    expect(texts('.ln-ext-perf__streak > b')).toEqual([
      '47games',
      '5games',
      '58games',
      '3 days, 5 hours',
    ]);
    const [win] = queryAll(document, '.ln-ext-perf__streak > a', HTMLAnchorElement);
    expect(win?.getAttribute('href')).toBe('/game/Qc8QEQ4y?pov=Lance5500');
    expect(win?.textContent).toMatch(/^Apr 21\s*–\s*Nov 26, 2021$/);
    expect(texts('.ln-ext-perf__current b')).toEqual(['1', '–', '–', '0 minutes']);
    // Lichess dashes whatever has a tooltip: an empty one is left out.
    expect(queryAll(document, '.ln-ext-perf__streak h3 [title]', HTMLElement)).toHaveLength(2);
  });

  it('shows the best wins and worst defeats, a row each, linked to the player and the game', () => {
    found('section.result').insertAdjacentHTML('beforeend', WORST);
    syncPerfStat();
    expect(texts('.ln-ext-perf__opponents h3')).toEqual([
      'Best rated victories',
      'Worst rated defeats',
    ]);
    const [first] = queryAll(document, '.ln-ext-perf__opponent', HTMLElement);
    const link = first && queryOne(first, 'a.user-link.ulpt', HTMLAnchorElement);
    expect(link?.getAttribute('href')).toBe('/@/OjaiJoao');
    expect(link?.querySelector('.utitle')?.textContent).toBe('FM');
    const avatar = first && queryOne(first, '.ln-ext-perf__avatar', HTMLElement);
    expect(avatar?.dataset.lnExtAvatarCoach).toMatch(/^\d+$/);
    // The date keeps a class of ours: Lichess takes `glpt` off once it hooks its preview.
    expect(first?.querySelector('.ln-ext-perf__day.glpt')?.textContent).toBe('Mar 15, 2026');
    expect(texts('.ln-ext-perf__opponent .ln-ext-perf__pill').at(-1)).toBe('1770');
    expect(
      queryAll(document, '.ln-ext-perf__opponents', HTMLElement).map(
        card => card.querySelector<HTMLElement>('.ln-ext-perf__pill')?.dataset.lnExtTone,
      ),
    ).toEqual(['green', 'red']);
  });

  it('builds the cards once', () => {
    syncPerfStat();
    syncPerfStat();
    expect(queryAll(document, '.ln-ext-perf', HTMLElement)).toHaveLength(2);
  });

  it('leaves a page with no rating alone', () => {
    found('section.glicko').remove();
    syncPerfStat();
    expect(queryAll(document, '.ln-ext-perf', HTMLElement)).toHaveLength(0);
    expect(found('.perf-stat__content').dataset.lnExtPerf).toBeUndefined();
  });
});
