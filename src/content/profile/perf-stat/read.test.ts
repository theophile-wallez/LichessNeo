import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import fixture from './fixtures/perf-stat.json' with { type: 'json' };
import {
  readExtremes,
  readFigures,
  readGlicko,
  readOpponents,
  readStreaks,
  withoutColon,
} from './read.ts';

const PAGE = fixture.html;

function content(): HTMLElement {
  const element = queryOne(document, '.perf-stat__content', HTMLElement);
  if (!element) throw new Error('no content');
  return element;
}

beforeEach(() => {
  document.body.innerHTML = `<main class="page-menu">${PAGE}</main>`;
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe("a rating's stats page, read", () => {
  it('reads the rating, the share of players it beats, its progress and deviation', () => {
    const glicko = readGlicko(content());
    expect(glicko).toMatchObject({
      label: 'Rating',
      rating: 2460,
      written: '2460',
      percentile: '99.9%',
      sentence: 'Lance5500 is better than 99.9% of Classical players.',
      progress: { label: 'Progression over the last 12 games', value: 3 },
      deviation: { label: 'Rating deviation', value: '59.37' },
    });
    expect(glicko?.deviation?.tip).toMatch(/^Lower value means the rating is more stable/);
  });

  it('reads Lichess’s rating where its Chess.com equivalent is shown, and a fall', () => {
    const strong = queryOne(content(), 'section.glicko > h2 > strong', HTMLElement);
    const progress = queryOne(content(), '.progress', HTMLElement);
    if (!strong || !progress) throw new Error('no rating');
    strong.dataset.lnExtLichessRating = '2460.28';
    strong.textContent = '2528';
    progress.innerHTML = '<red data-icon="">12</red>';
    expect(readGlicko(content())).toMatchObject({ rating: 2460, progress: { value: -12 } });
  });

  it('reads the counts’ tables, row by row', () => {
    const [games, results] = readFigures(content());
    expect(games?.map(figure => [figure.label, figure.value, figure.share])).toEqual([
      ['Total games', '3,201', ''],
      ['Rated games', '424', '13%'],
      ['Tournament games', '287', '9%'],
      ['Berserked games', '281', '98%'],
      ['Time spent playing', '109 days, 7 hours', ''],
    ]);
    expect(results?.[1]).toEqual({ label: 'Victories', value: '2,328', share: '73%' });
  });

  it('reads the highest and the lowest rating, and the game each was reached in', () => {
    expect(readExtremes(content())).toEqual([
      {
        label: 'Highest rating',
        rating: 2622,
        game: { href: '/game/Uc4HE33T?pov=Lance5500', at: '2017-10-16T01:48:49.983Z' },
      },
      {
        label: 'Lowest rating',
        rating: 2052,
        game: { href: '/game/U8wY7ss2?pov=Lance5500', at: '2018-05-19T01:12:16.331Z' },
      },
    ]);
  });

  it('reads the four streaks: a count with its unit, a duration, or none going on', () => {
    const streaks = readStreaks(content());
    expect(streaks.map(streak => [streak.kind, streak.title, streak.tip])).toEqual([
      ['win', 'Winning streak', ''],
      ['loss', 'Losing streak', ''],
      ['play', 'Games played in a row', 'Less than one hour between games'],
      ['time', 'Max time spent playing', 'Less than one hour between games'],
    ]);
    const [win, loss, , time] = streaks;
    expect(win?.longest).toMatchObject({
      label: 'Longest streak',
      count: '47',
      rest: 'games',
      from: { href: '/game/Qc8QEQ4y?pov=Lance5500' },
      to: { href: '/game/S1K9Hw98?pov=Lance5500' },
    });
    expect(loss?.current).toEqual({
      label: 'Current streak',
      count: null,
      rest: '-',
      from: null,
      to: null,
    });
    expect(time?.longest).toMatchObject({ count: null, rest: '3 days, 5 hours' });
    expect(time?.current).toMatchObject({ count: null, rest: '0 minutes' });
  });

  it('reads the best wins: the opponent, their title and flair, their rating and the game', () => {
    const [best, worst] = readOpponents(content());
    expect(worst).toBeUndefined();
    expect(best?.title).toBe('Best rated victories');
    expect(best?.kind).toBe('best');
    expect(best?.opponents).toHaveLength(5);
    expect(best?.opponents[0]).toEqual({
      href: '/@/OjaiJoao',
      name: 'OjaiJoao',
      title: { text: 'FM', tip: 'FIDE Master' },
      flair: 'https://lichess.org/assets/______5/flair/img/food-drink.bell-pepper.webp',
      rating: '2502',
      game: { href: '/game/OS80LePE?pov=Lance5500', at: '2026-03-15T15:26:39.942Z' },
    });
    expect(best?.opponents[1]).toMatchObject({ name: 'Whippididooda', title: null, flair: null });
  });

  it('reads a page with no rated game yet: the rating alone', () => {
    document.body.innerHTML = `<div class="perf-stat__content"><section class="glicko"><h2>Rating: <strong>1500?</strong>.</h2></section></div>`;
    expect(readGlicko(content())).toMatchObject({
      rating: 1500,
      written: '1500?',
      percentile: null,
      sentence: '',
      progress: null,
      deviation: null,
    });
    expect(readExtremes(content())).toEqual([null, null]);
    expect(readStreaks(content())).toEqual([]);
  });

  it('takes the colon off a label, French spacing included', () => {
    expect(withoutColon('Rating: ')).toBe('Rating');
    expect(withoutColon('Série actuelle : ')).toBe('Série actuelle');
  });
});
