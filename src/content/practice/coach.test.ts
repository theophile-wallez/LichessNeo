import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORD_MS } from '#shared/coach-voice.ts';
import { queryOne } from '#shared/dom.ts';
import { showCoach, type showCoach as ShowCoach } from '#content/coach/index.ts';
import { startSyncLoop } from '#content/sync-loop.ts';
import { practiceCoach } from './coach.ts';

// The mascots are WebGL scenes, out of happy-dom's reach.
vi.mock('#content/coach/index.ts', () => ({ showCoach: vi.fn<typeof ShowCoach>() }));

const TICK_MS = 250;

const BOX =
  '<div class="practice-box training-box sub-box no-verdict"><div class="feedback">' +
  '<div class="player running"><div class="no-square"><piece class="king white"></piece></div>' +
  '<div class="instruction"><strong>Your turn</strong><div class="choices"><a>Get a hint</a></div>' +
  '</div></div></div><div class="comment"></div></div>';

const DRILL =
  '<main class="analyse"><aside class="practice__side"><div class="practice__side__chapters">' +
  '<a class="ps__chapter done" data-id="a1"><span class="status"></span><h3>Back-Rank Mate #1</h3></a>' +
  '<a class="ps__chapter active" data-id="b2"><span class="status"></span><h3>Hook Mate #1</h3></a>' +
  `</div></aside><div class="analyse__tools">${BOX}</div>` +
  '<div class="analyse__underboard"><div class="feedback ongoing">' +
  '<div class="goal">Checkmate the opponent</div><div class="comment">Use your rook.</div>' +
  '</div></div></main>';

beforeAll(() => {
  vi.useFakeTimers();
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
  document.documentElement.dataset.lnExtCoach = '3';
  practiceCoach.start();
  startSyncLoop();
});

afterAll(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.lnExtCoach;
});

beforeEach(() => {
  document.body.innerHTML = DRILL;
  vi.mocked(showCoach).mockClear();
});

const find = (selector: string): HTMLElement => {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

const words = (): string =>
  [...find('.ln-ext-practice-coach').querySelectorAll('.ln-ext-w--in')]
    .map(word => word.textContent)
    .join('');

/** Lets the coach start and type `text` out. */
function waitForWords(text: string): void {
  vi.advanceTimersByTime(TICK_MS + 150 + WORD_MS * text.split(' ').length);
}

describe('the practice coach', () => {
  it('says the goal on the goal’s card, under the exercise’s place in the lesson', () => {
    waitForWords('Checkmate the opponent');
    const card = find('.analyse__underboard > .ln-ext-practice-coach');
    expect(find('.ln-ext-coach-card__kicker').textContent).toBe('2 / 2 · Hook Mate #1');
    expect(words()).toBe('Checkmate the opponent');
    expect(card.dataset.lnExtMood).toBe('neutral');
    expect(showCoach).toHaveBeenCalledWith({ coach: 3, mood: 'neutral', talking: true });
  });

  it('shows whose turn it is under its words, its hint clicking Lichess’s', () => {
    vi.advanceTimersByTime(TICK_MS);
    const link = find('.practice-box .choices a');
    link.addEventListener('click', () => {
      link.textContent = 'See best move';
    });
    const row = find('.ln-ext-practice-coach .ln-ext-bubble > .ln-ext-practice-turn');
    expect(row.dataset.lnExtColor).toBe('white');
    expect(find('.ln-ext-practice-turn__status').textContent).toBe('Your turn');
    const hint = find('.ln-ext-practice-turn__hint');
    hint.click();
    expect(hint.textContent).toBe('See best move');
  });

  it('shows the last move’s verdict', () => {
    vi.advanceTimersByTime(TICK_MS);
    const box = find('.practice-box');
    box.classList.replace('no-verdict', 'goodMove');
    find('.practice-box .comment').innerHTML =
      '<span class="verdict">Good move</span> Another was <move><san>Rh6+</san></move>';
    vi.advanceTimersByTime(TICK_MS);
    expect(find('.ln-ext-practice-turn').dataset.lnExtQuality).toBe('goodMove');
    expect(find('.ln-ext-practice-turn__verdict').textContent).toBe('Good move');
    expect(find('.ln-ext-practice-turn__advice').textContent).toBe('Another was Rh6+');
  });

  it('comforts in its own words when the exercise is missed', () => {
    waitForWords('Checkmate the opponent');
    const underboard = find('.analyse__underboard');
    underboard.querySelector('.feedback')?.remove();
    underboard.insertAdjacentHTML(
      'afterbegin',
      '<a class="feedback fail"><span>Puzzle failed!</span><strong>Click to retry</strong></a>',
    );
    waitForWords('practiceMissed');
    expect(words()).toBe('practiceMissed');
    expect(find('.ln-ext-practice-coach').dataset.lnExtMood).toBe('worry');
  });

  it('stays off an analysis board practicing with the computer', () => {
    find('.practice__side').remove();
    vi.advanceTimersByTime(TICK_MS * 2);
    expect(document.querySelector('.ln-ext-practice-coach')).toBeNull();
  });
});
