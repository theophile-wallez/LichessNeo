import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { briefMarkup, turningMove } from './brief.ts';
import { watchClicks } from './clicks.ts';
import { keyMoments } from './moments.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

describe('the coach’s brief', () => {
  it('names the move the game turned on as a button that goes to it', () => {
    const { session, facade } = judgedGame('opera');
    const { review } = session.view;
    if (!review) throw new Error('no review');
    const turning = turningMove(keyMoments(review));
    if (!turning) throw new Error('no turning move');
    const { panel } = session.elements;
    panel.innerHTML = briefMarkup(session, review).value;
    document.body.append(panel);
    watchClicks(session);
    const button = queryOne(panel, '.ln-ext-brief__turn', HTMLButtonElement);
    expect(button?.dataset.lnExt).toBe('moment');
    expect(button?.dataset.lnExtPly).toBe(String(turning.ply));
    button?.click();
    expect(facade.node.ply).toBe(turning.ply);
  });

  it('leaves the errors’ counts and the start button to the panel', () => {
    const { session } = judgedGame('opera');
    const { review } = session.view;
    if (!review) throw new Error('no review');
    document.body.innerHTML = briefMarkup(session, review).value;
    expect(document.querySelector('.ln-ext-brief__chip')).toBeNull();
    expect(document.querySelector('[data-ln-ext="next"]')).toBeNull();
  });
});
