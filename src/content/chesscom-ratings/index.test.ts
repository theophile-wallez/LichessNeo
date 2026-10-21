import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
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
      [`alex1${equivalent('blitz', 1400)} +6`, '1400 on Lichess'],
    ]);
  });

  it('swap a profile’s cards and a rating’s stats page', () => {
    history.replaceState(null, '', '/@/eresy/perf/rapid');
    document.body.innerHTML = `<div class="side sub-ratings"><a href="/@/eresy/perf/classical"><span><h3>Classical</h3><rating><strong>2000</strong> <span>12 games</span></rating></span></a></div>
      <div class="perf-stat"><h2>Rating: <strong>1650.37</strong>. <span class="details">Better than <strong>60%</strong></span></h2></div>`;
    tick();
    expect(shown('strong')).toEqual([
      [equivalent('classical', 2000), '2000 on Lichess'],
      [equivalent('rapid', 1650.37), '1650.37 on Lichess'],
      ['60%', undefined],
    ]);
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
