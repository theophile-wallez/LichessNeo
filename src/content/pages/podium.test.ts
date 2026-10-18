import { afterEach, describe, expect, it } from 'vitest';
import { podiumScores, syncPodium } from './podium.ts';

// The init data and podium markup as an Arena and a Swiss serve them, cut to what we read.
const ARENA_INIT = JSON.stringify({
  data: {
    podium: [
      { name: 'matejovicjuraj', rank: 1, score: 36, nb: { game: 15, win: 12, berserk: 0 } },
      { name: 'lemfan', rank: 2, score: 36, nb: { game: 15, win: 12, berserk: 0 } },
      { name: 'Mtvrali', title: 'NM', rank: 3, score: 34, nb: { game: 13, win: 11, berserk: 2 } },
    ],
  },
});

const SWISS_INIT = JSON.stringify({
  data: {
    podium: [
      { user: { name: 'AdamFink', id: 'adamfink' }, points: 7.5, tieBreak: 27 },
      { user: { name: 'imenjak12345', id: 'imenjak12345' }, points: 7, tieBreak: 31 },
    ],
  },
});

const place = (position: string, user: string): string =>
  `<div class="${position}"><div class="trophy"></div><a class="user-link ulpt" href="/@/${user}">${user}</a><table class="stats"></table></div>`;

const ARENA_PODIUM = `<main class="tour"><div class="podium">${place('second', 'lemfan')}${place('first', 'matejovicjuraj')}${place('third', 'Mtvrali')}</div></main>`;

const scoresShown = (): (string | null)[] =>
  Array.from(document.querySelectorAll('.podium > div'), div => {
    const score = div.querySelector(':scope > .ln-ext-podium__score');
    return score ? score.textContent : null;
  });

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.lang = '';
  delete document.documentElement.dataset.lnExtPointsLabel;
});

describe('podium scores', () => {
  it('reads an Arena’s scores and a Swiss’s points, by lower-cased name', () => {
    expect([...podiumScores(ARENA_INIT)]).toEqual([
      ['matejovicjuraj', 36],
      ['lemfan', 36],
      ['mtvrali', 34],
    ]);
    expect([...podiumScores(SWISS_INIT)]).toEqual([
      ['adamfink', 7.5],
      ['imenjak12345', 7],
    ]);
  });

  it('reads none from a page without a podium or with malformed data', () => {
    expect(podiumScores(null).size).toBe(0);
    expect(podiumScores('{"data":{"id":"x"}}').size).toBe(0);
    expect(podiumScores('{"data":{"podium":[{"name":"a","score":"36"}]}}').size).toBe(0);
  });
});

describe('the podium', () => {
  it('shows each player’s score with Lichess’s word for it', () => {
    document.body.innerHTML = ARENA_PODIUM;
    document.documentElement.dataset.lnExtPointsLabel = 'Punkte';
    syncPodium(podiumScores(ARENA_INIT));
    expect(scoresShown()).toEqual(['36 Punkte', '36 Punkte', '34 Punkte']);
    const score = document.querySelector('.first > .ln-ext-podium__score');
    expect(score?.querySelector('b')?.textContent).toBe('36');
    expect(score?.previousElementSibling?.matches('table.stats')).toBe(true);
  });

  it('writes the number in the page’s language, and only once', () => {
    document.body.innerHTML = `<main class="swiss"><div class="podium">${place('first', 'AdamFink')}</div></main>`;
    document.documentElement.lang = 'fr';
    const scores = podiumScores(SWISS_INIT);
    syncPodium(scores);
    const score = document.querySelector('.ln-ext-podium__score');
    expect(score?.textContent).toBe('7,5');
    syncPodium(scores);
    expect(document.querySelector('.ln-ext-podium__score')).toBe(score);
    expect(document.querySelectorAll('.ln-ext-podium__score')).toHaveLength(1);
  });

  it('adds the word once Lichess’s translations are in', () => {
    document.body.innerHTML = ARENA_PODIUM;
    const scores = podiumScores(ARENA_INIT);
    syncPodium(scores);
    expect(scoresShown()).toEqual(['36', '36', '34']);
    document.documentElement.dataset.lnExtPointsLabel = 'Points';
    syncPodium(scores);
    expect(scoresShown()).toEqual(['36 Points', '36 Points', '34 Points']);
  });

  it('leaves a player it has no score for, and other pages, alone', () => {
    document.body.innerHTML = `${ARENA_PODIUM.replace('lemfan', 'someone')}<div class="podium">${place('first', 'lemfan')}</div>`;
    syncPodium(podiumScores(ARENA_INIT));
    expect(scoresShown()).toEqual([null, '36', '34', null]);
  });
});
