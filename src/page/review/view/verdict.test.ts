import { afterEach, describe, expect, it } from 'vitest';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { formatEval } from '#page/review/evaluation/format.ts';
import { commentOn, openingOf, timeTag, verdictMarkup } from './verdict.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

describe('a book move of the game', () => {
  it('names the export’s opening only on the move that reaches it', () => {
    const { session } = judgedGame('opera');
    const book = (session.view.review?.moves ?? []).filter(move => move?.moveClass === 'book');
    expect(book.map(move => move?.ply)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const named = book.map(move => (move ? openingOf(session, move) : null));
    expect(named).toEqual([
      ...Array.from({ length: 8 }, () => ''),
      'Sicilian Defense: Najdorf Variation',
    ]);
  });

  it('keeps the name a move played off the game carries', () => {
    const { session } = judgedGame('opera');
    const first = session.view.review?.moves[0];
    if (!first) throw new Error('the first move is not judged');
    expect(openingOf(session, { ...first, opening: 'King’s Pawn Game' })).toBe('King’s Pawn Game');
  });
});

/** The time tag `markup` draws. */
function timeTagIn(markup: string): HTMLElement {
  document.body.innerHTML = markup;
  const found = document.querySelector('.lr-ext-tag--time');
  if (!(found instanceof HTMLElement)) throw new Error('no time tag');
  return found;
}

describe('a move’s time', () => {
  const { session } = judgedGame('opera');
  const move = session.view.review?.moves.find(judged => judged?.moveClass === 'best');
  if (!move) throw new Error('no best move');
  const timed = (spent: number) =>
    commentOn(session, {
      move,
      gameId: 'opera',
      hint: [],
      timing: { spent, clock: 170, initial: 180, usual: 3 },
    });

  it('puts the coach’s advice in the time’s tooltip, not in the bubble', () => {
    const comment = timed(27);
    const time = timeTagIn(timeTag(session, comment).toString());
    expect(time.textContent).toBe('27 s');
    expect(time.classList.contains('lr-ext-tag--paidOff')).toBe(true);
    expect(time.dataset.lrExtTip).toMatch(/spent 27 s on this move, and it was worth it\.$/);
    const bubble = verdictMarkup(session, comment).value;
    expect(bubble).not.toContain('worth it');
  });

  it('shows a plain time when the coach has nothing to say of it', () => {
    const time = timeTagIn(timeTag(session, timed(2)).toString());
    expect(time.textContent).toBe('2 s');
    expect(time.className).toBe('lr-ext-tag lr-ext-tag--time');
    expect(time.dataset.lrExtTip).toBeUndefined();
  });

  it('shows none without clocks', () => {
    expect(timeTag(session, { ...timed(27), timing: null })).toBe('');
  });
});

describe('a verdict’s score', () => {
  it('shows the score after the move, with no tooltip on a move that gave nothing away', () => {
    const { session } = judgedGame('opera');
    const move = session.view.review?.moves.find(judged => judged?.moveClass === 'best');
    if (!move) throw new Error('no best move');
    const comment = commentOn(session, { move, gameId: 'opera', hint: [], timing: null });
    document.body.innerHTML = verdictMarkup(session, comment).toString();
    const score = document.querySelector('.lr-ext-bubble__evals');
    if (!(score instanceof HTMLElement)) throw new Error('no score');
    expect(score.querySelectorAll('.lr-ext-bubble__eval')).toHaveLength(1);
    expect(score.textContent).toBe(formatEval(move.after));
    expect(score.dataset.lrExtTip).toBeUndefined();
  });

  it('says what an error gave away in its tooltip, not in the tags', () => {
    const { session } = judgedGame('opera');
    const move = session.view.review?.moves.find(judged => judged?.moveClass === 'mistake');
    if (!move) throw new Error('no mistake');
    const comment = commentOn(session, { move, gameId: 'opera', hint: [], timing: null });
    document.body.innerHTML = verdictMarkup(session, comment).toString();
    const score = document.querySelector('.lr-ext-bubble__evals');
    if (!(score instanceof HTMLElement)) throw new Error('no score');
    expect(score.dataset.lrExtTip).toMatch(/^−\d+% winning chances$/);
    expect(document.body.textContent).not.toContain('winning chances');
  });
});
