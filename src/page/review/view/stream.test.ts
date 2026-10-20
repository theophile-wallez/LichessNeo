import { describe, expect, it } from 'vitest';
import { html, setHtml } from '#shared/html.ts';
import { type CommentPart, commentKey, commentMarkup } from '#page/review/comment/markup.ts';
import { fakeReviewLayout } from '#page/review/fixtures/fake-review-layout.ts';
import { newSession } from '#page/review/fixtures/unit-review.ts';
import { en } from '#page/review/i18n/en.ts';
import { refitStream, startStream } from './stream.ts';

/** A sentence of `count` words, `droppable` or not. */
const sentence = (word: string, count: number, droppable: boolean): CommentPart => ({
  text: Array.from({ length: count }, () => word).join(' '),
  droppable,
});

/** The comment `parts` typed out in full in the bubble, then fitted to its room. */
function fitted(parts: readonly CommentPart[]) {
  fakeReviewLayout();
  const session = newSession();
  session.stream.state = { key: commentKey(parts), shown: Infinity, dropped: 0 };
  const markup = commentMarkup(parts, { stream: session.stream.state, language: en });
  setHtml(session.elements.panel, html`<div class="ln-ext-bubble__sub">${markup}</div>`);
  startStream(session);
  // Each sentence left, by its word.
  const left = [...session.elements.panel.querySelectorAll('.ln-ext-say')].map(
    said => said.textContent.trim()[0],
  );
  return { session, left };
}

// The bubble holds 22 words (fixtures/fake-review-layout.ts).
describe('startStream', () => {
  it('drops the droppable sentences one by one, the first first, until the rest fits', () => {
    const once = fitted([
      sentence('a', 10, true),
      sentence('b', 10, true),
      sentence('c', 10, false),
    ]);
    expect([once.session.stream.state.dropped, once.left]).toEqual([1, ['b', 'c']]);
    const twice = fitted([
      sentence('a', 10, true),
      sentence('b', 10, true),
      sentence('c', 20, false),
    ]);
    expect([twice.session.stream.state.dropped, twice.left]).toEqual([2, ['c']]);
  });

  it('keeps every sentence of a comment that fits, and drops no more than the droppable', () => {
    const fits = fitted([sentence('a', 5, true), sentence('c', 10, false)]);
    expect([fits.session.stream.state.dropped, fits.left]).toEqual([0, ['a', 'c']]);
    const long = fitted([sentence('a', 10, true), sentence('c', 40, false)]);
    expect([long.session.stream.state.dropped, long.left]).toEqual([1, ['c']]);
  });

  it('takes the dropped sentences back once the bubble is fitted again', () => {
    const { session } = fitted([sentence('a', 10, true), sentence('c', 20, false)]);
    refitStream(session);
    expect(session.stream.state.dropped).toBe(0);
  });
});
