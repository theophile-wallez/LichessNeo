import { afterEach, describe, expect, it } from 'vitest';
import { fakeGame, newSession } from '#page/review/fixtures/unit-review.ts';
import { renderLive } from './live-panel.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

/** The free board's panel as drawn: the coach's mood, then its words. */
function drawn(path: string): { mood: string | undefined; panel: HTMLElement } {
  const { ctrl, facade } = fakeGame('opera');
  ctrl.userJump(path);
  const session = newSession();
  renderLive(session, facade);
  const { panel } = session.elements;
  const avatar = panel.querySelector('.lr-ext-coach__avatar');
  return { mood: avatar instanceof HTMLElement ? avatar.dataset.lrExtMood : undefined, panel };
}

const texts = (panel: HTMLElement, selector: string): (string | null)[] =>
  Array.from(panel.querySelectorAll(selector), element => element.textContent);

describe('the free board’s coach', () => {
  it('says what it will do before a move is played', () => {
    const { mood, panel } = drawn('');
    expect(mood).toBe('neutral');
    expect(texts(panel, '.lr-ext-bubble__title')).toEqual(['Play a move.']);
    expect(texts(panel, '.lr-ext-bubble__sub')).toEqual([
      'I’ll tell you if it’s the best, an inaccuracy or a blunder.',
    ]);
  });

  it('thinks the move over while the engine judges it, where its verdict will land', () => {
    const { ctrl } = fakeGame('opera');
    const first = ctrl.mainline[1]?.id ?? '';
    const { mood, panel } = drawn(first);
    expect(mood).toBe('thinking');
    expect(texts(panel, '.lr-ext-bubble__row .lr-ext-bubble__title')).toEqual([
      'Let me look at this move…',
    ]);
    expect(panel.querySelector('.lr-ext-bubble__row .lr-ext-bubble__spin')).not.toBeNull();
    expect(panel.querySelectorAll('.lr-ext-bubble__wait > span')).toHaveLength(2);
  });
});
