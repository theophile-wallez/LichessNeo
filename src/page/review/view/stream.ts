import { queryAll, queryOne } from '#shared/dom.ts';
import type { Session } from '#page/review/session.ts';
import { tellCoach } from './coach-avatar.ts';

// The coach's comment types out word by word (comment/markup.ts draws each
// moment of it); this runs the typing's clock.

/** A word's turn to show, as the coach types its comment out (the game over's card too). */
export const WORD_MS = 35;
const FALLBACK_LINE_HEIGHT = 18;

interface Fit {
  readonly scrollHeight: number;
  readonly clientHeight: number;
  /** The computed `line-height`, as CSS gives it ("18px", "normal"). */
  readonly lineHeight: string;
}

/**
 * Whether the comment runs past the bubble's room by a whole line: a move
 * chip poking a pixel out of the last one doesn't count.
 */
export const overflows = ({ scrollHeight, clientHeight, lineHeight }: Fit): boolean =>
  scrollHeight > clientHeight + (Number.parseFloat(lineHeight) || FALLBACK_LINE_HEIGHT) / 2;

function tick(session: Session): void {
  const { stream } = session;
  const words = queryAll(session.elements.panel, '.lr-ext-bubble__sub .lr-ext-w', HTMLElement);
  const word = words[stream.state.shown];
  stream.state = { ...stream.state, shown: stream.state.shown + 1 };
  if (word) word.className = 'lr-ext-w lr-ext-w--in';
  if (stream.state.shown >= words.length) {
    clearInterval(stream.timer);
    stream.timer = 0;
    tellCoach(session);
  }
}

/**
 * After a render: drops the sentence that doesn't fit, then carries on typing.
 * What still doesn't fit scrolls (review/bubble.css).
 */
export function startStream(session: Session): void {
  const { panel } = session.elements;
  const sub = queryOne(panel, '.lr-ext-bubble__sub', HTMLElement);
  if (!sub) return;
  const room = queryOne(panel, '.lr-ext-bubble__body', HTMLElement) ?? sub;
  const { stream } = session;
  const drop = queryOne(sub, '.lr-ext-say--drop', HTMLElement);
  const fit = (): Fit => ({
    scrollHeight: room.scrollHeight,
    clientHeight: room.clientHeight,
    lineHeight: getComputedStyle(sub).lineHeight,
  });
  if (drop && overflows(fit())) {
    drop.remove();
    // Recount the words typed so far, now that the dropped sentence is gone.
    const shown =
      stream.state.shown === Infinity
        ? Infinity
        : sub.querySelectorAll('.lr-ext-w:not(.lr-ext-w--off)').length;
    stream.state = { ...stream.state, dropped: true, shown };
  }
  if (stream.state.shown < sub.querySelectorAll('.lr-ext-w').length && stream.timer === 0) {
    stream.timer = setInterval(() => tick(session), WORD_MS);
    tellCoach(session);
  }
}

/**
 * On a new width, a comment that is fully typed out is laid out again whole,
 * so a sentence dropped for lack of room can come back. A comment still being
 * typed is left as it is, or its words would be counted again.
 */
export function refitStream(session: Session): void {
  const { stream } = session;
  if (stream.timer !== 0) return;
  stream.state = { ...stream.state, dropped: false, shown: Infinity };
}
