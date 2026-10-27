import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { chesscomRating, chesscomRatingChange } from '#shared/chesscom-rating/convert.ts';
import { chesscomShown } from '#shared/chesscom-rating/shown.ts';
import { queryAll } from '#shared/dom.ts';
import { createPlayersSync } from '#content/analysis/players.ts';
import { chesscomRatings } from './index.ts';

const settings = vi.hoisted(() => ({ chesscomRating: true }));
const listeners = vi.hoisted((): Array<(value: typeof settings) => void> => []);
const ticks = vi.hoisted((): Array<() => void> => []);

vi.mock('#content/settings/settings.ts', () => ({
  currentSettings: () => settings,
  onSettings: (listener: (value: typeof settings) => void) => listeners.push(listener),
}));
vi.mock('#content/sync-loop.ts', () => ({
  onEveryTick: (_name: string, run: () => void) => ticks.push(run),
}));

const tick = (): void => {
  for (const run of ticks) run();
};

const equivalent = (speed: string, rating: number): string =>
  String(chesscomRating(speed, rating)?.rating);

// A change is the gap between the converted ratings it sits between.
const equivalentChange = (speed: string, rating: number, change: number): number =>
  chesscomRatingChange(speed, { before: rating, after: rating + change }) ?? 0;

// What each rating shows, and the Lichess one its tooltip gives.
const shown = (selector: string): (string | undefined)[][] =>
  queryAll(document, selector, HTMLElement).map(element => [
    element.textContent.trim(),
    element.dataset.lnExtTip,
  ]);

beforeAll(() => chesscomRatings.start());

beforeEach(() => {
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (_name: string, rating: string[]) => `${rating[0]} on Lichess` },
  });
  settings.chesscomRating = true;
});

afterEach(() => {
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
});

describe('the ratings as on Chess.com', () => {
  it('swap a game’s bars and info for its speed', () => {
    document.body.innerHTML = `<main class="round">
      <div class="ruser-top ruser"><a class="user-link" href="/@/hikaru">Hikaru</a><rating>2950</rating></div>
      <div class="game__meta"><div class="game__meta__infos" data-icon="\ue032"></div>
        <div class="game__meta__players"><div class="player white"><a class="user-link">Eresy<span class="rating">1500</span></a></div></div>
      </div></main>`;
    tick();
    expect(shown('rating, .rating')).toEqual([
      [equivalent('bullet', 2950), '2950 on Lichess'],
      [equivalent('bullet', 1500), '1500 on Lichess'],
    ]);
  });

  it('swap the change a game’s bars and info show at its end, from the rating it was played at', () => {
    // A blitz game just over (JPlQIL4q): the loser's bar, then the info, as Lichess writes them.
    document.body.innerHTML = `<main class="round">
      <div class="game__meta__infos" data-icon="\ue008"></div>
      <div class="ruser-top ruser"><a class="user-link">KapetanKapitalizma</a><rating>1724</rating><bad class="rp">7</bad></div>
      <div class="game__meta__players"><div class="player white"><a class="user-link">Eresy<span class="rating"> (1640)</span> <good>+28</good></a></div></div>
      </main>`;
    tick();
    expect(shown('rating, .rating, .rp, good')).toEqual([
      [equivalent('blitz', 1724), '1724 on Lichess'],
      [String(-equivalentChange('blitz', 1724, -7)), '−7 on Lichess'],
      [`(${equivalent('blitz', 1640)})`, '1640 on Lichess'],
      [`+${equivalentChange('blitz', 1640, 28)}`, '+28 on Lichess'],
    ]);
  });

  it('keep a variant’s and correspondence’s', () => {
    document.body.innerHTML = `<div class="game__meta__infos" data-icon="\ue00b"></div><div class="ruser"><rating>1800</rating></div>
      <a class="mini-game crazyhouse" data-tc="180+0"><span class="mini-game__user">a<span class="rating">1700</span></span></a>
      <a class="mini-game standard"><span class="mini-game__user">b<span class="rating">1600</span></span></a>`;
    tick();
    expect(shown('rating, .rating').map(([text]) => text)).toEqual(['1800', '1700', '1600']);
  });

  it('swap mini games by their clock, and lists of games by their glyph', () => {
    document.body.innerHTML = `<a class="mini-game standard" data-tc="600+0"><span class="mini-game__user">alex1<span class="rating">1900</span></span></a>
      <div class="game-row__infos"><div class="header" data-icon="\ue008"></div><div class="versus">
        <div class="player white"><a class="user-link">alex1</a><br>1400 <good>+6</good></div></div></div>`;
    tick();
    expect(shown('.mini-game .rating, .player')).toEqual([
      [equivalent('rapid', 1900), '1900 on Lichess'],
      [
        `alex1${equivalent('blitz', 1400)} +${equivalentChange('blitz', 1400, 6)}`,
        '1400 on Lichess',
      ],
    ]);
  });

  it('swap a profile’s cards and their progress, from today’s rating, and a rating’s stats page', () => {
    history.replaceState(null, '', '/@/eresy/perf/rapid');
    document.body.innerHTML = `<div class="side sub-ratings"><a href="/@/eresy/perf/classical"><span><h3>Classical</h3><rating><strong>2000</strong> <good class="rp">15</good> <span>12 games</span></rating></span></a></div>
      <div class="perf-stat"><h2>Rating: <strong>1650.37</strong>. <span class="details">Better than <strong>60%</strong></span></h2></div>`;
    tick();
    expect(shown('strong')).toEqual([
      [equivalent('classical', 2000), '2000 on Lichess'],
      [equivalent('rapid', 1650.37), '1650.37 on Lichess'],
      ['60%', undefined],
    ]);
    // Ours, on the same page, from Lichess's own rating.
    document.body.insertAdjacentHTML(
      'beforeend',
      '<strong class="ln-ext-perf__rating">1650</strong>',
    );
    tick();
    expect(shown('.ln-ext-perf__rating')).toEqual([[equivalent('rapid', 1650), '1650 on Lichess']]);
    // The progress led to today's rating; the count beside it is no change.
    expect(shown('rating > span, .rp')).toEqual([
      [String(equivalentChange('classical', 1985, 15)), '+15 on Lichess'],
      ['12 games', undefined],
    ]);
  });

  it('swap our cards of a rating’s stats page: its progress, its range and its opponents', () => {
    history.replaceState(null, '', '/@/eresy/perf/blitz');
    // As perf-stat/view-hero.ts and view-records.ts draw them.
    document.body.innerHTML = `<section class="ln-ext-perf__card ln-ext-perf__now"><strong class="ln-ext-perf__rating">1800</strong>
        <div class="ln-ext-perf__chips"><span class="ln-ext-perf__chip" data-ln-ext-tone="green" title="Progress"><svg></svg>+28</span><span class="ln-ext-perf__chip" title="Deviation">± 60</span></div></section>
      <section class="ln-ext-perf__range"><div class="ln-ext-perf__bar"><i></i><em>1800</em></div>
        <div class="ln-ext-perf__ends"><div class="ln-ext-perf__end"><span>Lowest</span><b>1200</b></div><div class="ln-ext-perf__end"><span>Highest</span><b>1900</b></div></div></section>
      <div class="ln-ext-perf__opponent"><a class="ln-ext-perf__game"><span class="ln-ext-perf__pill">2100</span></a></div>`;
    tick();
    expect(shown('.ln-ext-perf__chip')).toEqual([
      [`+${equivalentChange('blitz', 1772, 28)}`, '+28 on Lichess · Progress'],
      ['± 60', undefined],
    ]);
    expect(shown('em, b, .ln-ext-perf__pill').map(([text]) => text)).toEqual([
      equivalent('blitz', 1800),
      equivalent('blitz', 1200),
      equivalent('blitz', 1900),
      equivalent('blitz', 2100),
    ]);
  });

  it('swap a Swiss’s standings and an arena’s or a Swiss’s player card, by the event’s glyph', () => {
    document.body.innerHTML = `<div class="swiss__meta"><section data-icon="\ue032"></section></div>
      <table class="swiss__standing"><tr><td class="player"><a class="user-link"><span class="name">a</span><span class="rating">2444</span></a></td></tr></table>
      <div class="swiss__player-info"><div class="stats"><h2><span class="rank">1. </span><a class="user-link"><span class="name">a</span><span class="rating">2444</span></a></h2></div></div>`;
    tick();
    expect(shown('.rating').map(([text]) => text)).toEqual([
      equivalent('bullet', 2444),
      equivalent('bullet', 2444),
    ]);
    document.body.innerHTML = `<div class="tour__meta__head" data-icon="\ue002"></div>
      <div class="tour__player-info"><div class="stats"><h2><span class="rank">3</span><a class="user-link"><span class="name">b</span><span class="rating">1750</span></a></h2></div></div>`;
    tick();
    expect(shown('.rating')).toEqual([[equivalent('rapid', 1750), '1750 on Lichess']]);
  });

  it('swap the leaderboards, the lobby’s seeks, an arena’s standings and TV’s channels', () => {
    history.replaceState(null, '', '/player/top/blitz');
    document.body.innerHTML = `<ol class="user-top"><li><a class="user-link">a</a><span data-icon="\ue032" title="Bullet rating over 9 games">3000</span></li></ol>
      <section class="user-top"><h2 data-icon="\ue002"></h2><ol><li><a class="user-link">b2</a>2500</li></ol></section>
      <table class="slist-leaderboard"><tr><td>1</td><td><a>c</a></td><td>2400</td></tr></table>
      <table class="hooks__list"><tr class="hook"><td>d</td><td>1700?</td><td>3+2</td><td><span data-icon="\ue008">Rated</span></td></tr></table>
      <div class="tour__meta__head" data-icon="\ue00a"></div><table class="tour__standing"><tr><td class="player"><a>e<span class="rating">2100</span></a></td></tr></table>
      <div class="game__meta__infos" data-icon="\ue002"></div>
      <a class="tv-channel best"><span data-icon="\ue021"><span class="champion">f<rating> 2600</rating></span></span></a>
      <a class="tv-channel best active"><span data-icon="\ue021"><span class="champion">f<rating> 2650</rating></span></span></a>
      <a class="tv-channel blitz"><span data-icon="\ue008"><span class="champion">g<rating> 2700</rating></span></span></a>`;
    tick();
    expect(shown('[data-ln-ext-chesscom-rating]').map(([text]) => text)).toEqual([
      equivalent('bullet', 3000),
      `b2${equivalent('rapid', 2500)}`,
      equivalent('blitz', 2400),
      `${equivalent('blitz', 1700)}?`,
      equivalent('classical', 2100),
      equivalent('rapid', 2650),
      equivalent('blitz', 2700),
    ]);
    expect(shown('ol.user-top span')).toEqual([
      [equivalent('bullet', 3000), '3000 on Lichess · Bullet rating over 9 games'],
    ]);
  });

  it('give the analysis board’s bars the Lichess rating to swap in their turn', () => {
    document.body.innerHTML = `<main class="analyse"><div class="analyse__board"><div class="cg-wrap orientation-white"></div></div>
      <div class="game__meta__infos" data-icon="\ue008"></div>
      <div class="game__meta__players"><div class="player white"><a class="user-link">Eresy<span class="rating"> (1500)</span></a></div>
      <div class="player black"><a class="user-link">Hikaru<span class="rating"> (2900)</span></a></div></div></main>`;
    const bars = createPlayersSync();
    for (let i = 0; i < 3; i += 1) {
      bars();
      tick();
    }
    expect(shown('.ln-ext-player > rating')).toEqual([
      [equivalent('blitz', 2900), '2900 on Lichess'],
      [equivalent('blitz', 1500), '1500 on Lichess'],
    ]);
  });

  it('give Lichess’s back once switched off, and keep the switch for the page world', () => {
    document.body.innerHTML = `<div class="game__meta__infos" data-icon="\ue008"></div><div class="ruser"><rating>1500</rating></div>`;
    tick();
    settings.chesscomRating = false;
    for (const listener of listeners) listener(settings);
    tick();
    expect(shown('rating')).toEqual([['1500', undefined]]);
    expect(chesscomShown()).toBe(false);
    settings.chesscomRating = true;
    for (const listener of listeners) listener(settings);
    expect(chesscomShown()).toBe(true);
  });
});
