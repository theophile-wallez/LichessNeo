import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORD_MS } from '#shared/coach-voice.ts';
import { queryOne } from '#shared/dom.ts';
import { showCoach, type showCoach as ShowCoach } from '#content/coach/index.ts';
import { startSyncLoop } from '#content/sync-loop.ts';
import { learnCoach } from './coach.ts';

// The mascots are WebGL scenes, out of happy-dom's reach.
vi.mock('#content/coach/index.ts', () => ({ showCoach: vi.fn<typeof ShowCoach>() }));

const TICK_MS = 250;

beforeAll(() => {
  vi.useFakeTimers();
  document.documentElement.dataset.lnExtCoach = '3';
  learnCoach.start();
  startSyncLoop();
});

afterAll(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.lnExtCoach;
});

beforeEach(() => {
  document.body.innerHTML =
    '<main class="learn learn--run"><div class="learn__table"><div class="wrap">' +
    '<div class="title"></div><div class="goal">Grab the <br>star!</div>' +
    '<div class="progress"><a class="active" href="/learn#/1/1"></a></div></div></div></main>';
  vi.mocked(showCoach).mockClear();
});

const panel = (): HTMLElement => {
  const found = document.querySelector('.learn__table');
  if (!(found instanceof HTMLElement)) throw new Error('no panel');
  return found;
};

const avatarOf = (coach: Element | null): HTMLElement | null =>
  coach && queryOne(coach, '.ln-ext-coach__avatar', HTMLElement);

const words = (): string =>
  [...panel().querySelectorAll('.ln-ext-w--in')].map(word => word.textContent).join('');

/** Lets the coach start and type `text` out. */
function waitForWords(text: string): void {
  vi.advanceTimersByTime(TICK_MS + 150 + WORD_MS * text.split(' ').length);
}

describe('the Learn coach', () => {
  it('says the level’s goal in its card, at the panel’s end, in the coach picked', () => {
    waitForWords('Grab the star!');
    const coach = panel().querySelector('.ln-ext-learn-coach');
    expect(panel().lastElementChild).toBe(coach);
    expect(panel().dataset.lnExtLearnCoach).toBe('');
    expect(avatarOf(coach)?.dataset.lnExtCoachId).toBe('3');
    expect(words()).toBe('Grab the star!');
    expect(showCoach).toHaveBeenCalledWith({ coach: 3, mood: 'neutral', talking: true });
  });

  it('types once per saying, again when the level ends, with the mood it ends in', () => {
    waitForWords('Grab the star!');
    const coach = panel().querySelector('.ln-ext-learn-coach');
    vi.mocked(showCoach).mockClear();
    vi.advanceTimersByTime(TICK_MS * 4);
    expect(showCoach).not.toHaveBeenCalled();
    panel().querySelector('.goal')?.remove();
    panel()
      .querySelector('.wrap')
      ?.insertAdjacentHTML('beforeend', '<div class="result failed"><h2>Puzzle failed!</h2></div>');
    waitForWords('Puzzle failed!');
    expect(panel().querySelector('.ln-ext-learn-coach')).toBe(coach);
    expect(words()).toBe('Puzzle failed!');
    const avatar = avatarOf(coach);
    expect(avatar?.dataset.lnExtMood).toBe('worry');
    expect(avatar?.classList.contains('ln-ext-coach__avatar--react')).toBe(true);
  });

  it('says the goal with no coach to play when none is picked', () => {
    document.documentElement.dataset.lnExtCoach = 'none';
    waitForWords('Grab the star!');
    const coach = panel().querySelector('.ln-ext-learn-coach');
    expect(words()).toBe('Grab the star!');
    expect(avatarOf(coach)?.dataset.lnExtCoachId).toBeUndefined();
    expect(showCoach).not.toHaveBeenCalled();
    document.documentElement.dataset.lnExtCoach = '3';
  });

  it('stays off the other pages', () => {
    document.body.innerHTML = '<div class="learn__table"><div class="goal">Hi</div></div>';
    vi.advanceTimersByTime(TICK_MS * 2);
    expect(document.querySelector('.ln-ext-learn-coach')).toBeNull();
  });
});
