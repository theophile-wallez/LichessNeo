import { afterEach, describe, expect, it } from 'vitest';
import { setHtml } from '#shared/html.ts';
import { streamOn } from '#page/review/comment/markup.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { en } from '#page/review/i18n/en.ts';
import { fr } from '#page/review/i18n/fr.ts';
import { createSession, type RetryState, type Session } from '#page/review/session.ts';
import { createElements } from './elements.ts';
import { canRetry, type RetryOutcome, startRetry } from './retry.ts';
import { retryBubble, retryParts } from './retry-bubble.ts';
import { retryHint } from './retry-hint.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('what a retry’s hints give away', () => {
  it('gives nothing until one is asked for', () => {
    expect(retryHint(START, 'g1f3', 0)).toBeNull();
  });

  it('names the piece that has to move, and not its square', () => {
    expect(retryHint(START, 'g1f3', 1)).toEqual({
      piece: { color: 'white', role: 'knight' },
      square: null,
      marks: [],
    });
  });

  it('gives the square next, marked on the board', () => {
    expect(retryHint(START, 'g1f3', 2)).toEqual({
      piece: { color: 'white', role: 'knight' },
      square: 'g1',
      marks: [{ kind: 'ring', square: 'g1', tone: 'plan' }],
    });
  });

  it('gives nothing without a better move, nor for a square with no piece on it', () => {
    expect(retryHint(START, null, 2)).toBeNull();
    expect(retryHint(START, 'e5e6', 2)).toBeNull();
    expect(retryHint(START, '', 1)).toBeNull();
  });
});

/** A session in `language`, retrying the opera game's mistake, with `hints` asked for. */
function retrying(language: typeof en, hints: number): { session: Session; retry: RetryState } {
  const { session: judged, ctrl, facade } = judgedGame('opera');
  const move = judged.view.review?.moves[24];
  if (!move || !canRetry(move, facade)) throw new Error('that move is no longer a retriable error');
  const session = createSession({
    language,
    coach: 1,
    elements: createElements(),
    redraw: () => {},
    setMode: () => {},
  });
  ctrl.jumpToMain(25);
  startRetry(session, facade, move);
  const { retry } = session.view;
  if (!retry) throw new Error('no retry started');
  retry.hints = hints;
  return { session, retry };
}

/** The bubble as drawn in `session`, with `hints` asked for: the knight's g1f3 to find. */
function drawn(session: Session, retry: RetryState, outcome: RetryOutcome): HTMLElement {
  const retried = { retry, outcome, hint: retryHint(START, 'g1f3', retry.hints) };
  session.stream.state = streamOn(
    session.stream.state,
    retryParts(session, retried),
    session.language,
  );
  const host = document.createElement('div');
  setHtml(host, retryBubble(session, retried));
  return host;
}

/** The bubble typed out in full, retrying with `hints` asked for. */
function bubble(language: typeof en, hints: number): HTMLElement {
  const { session, retry } = retrying(language, hints);
  const host = drawn(session, retry, { kind: 'waiting' });
  session.stream.state = { ...session.stream.state, shown: Infinity };
  setHtml(
    host,
    retryBubble(session, {
      retry,
      outcome: { kind: 'waiting' },
      hint: retryHint(START, 'g1f3', hints),
    }),
  );
  return host;
}

/** Each word of the bubble's lines, and whether it's typed yet. */
const typedWords = (host: HTMLElement, line: string): boolean[] =>
  Array.from(
    host.querySelectorAll(`${line} .ln-ext-w`),
    word => !word.classList.contains('ln-ext-w--off'),
  );

const labels = (host: HTMLElement): (string | null)[] =>
  Array.from(host.querySelectorAll('.ln-ext-bubble__line'), button => button.textContent);

/** The coach's lines in the bubble: its hints, one per line. */
const said = (host: HTMLElement): (string | null)[] =>
  Array.from(host.querySelectorAll('.ln-ext-bubble__sub'), line => line.textContent);

describe('the retry’s hint button', () => {
  it('asks for a hint, then for another, then has nothing left to offer', () => {
    expect(labels(bubble(en, 0))).toEqual(['Hint', 'Show the answer']);
    expect(labels(bubble(en, 1))).toEqual(['Another hint', 'Show the answer']);
    expect(labels(bubble(en, 2))).toEqual(['Show the answer']);
  });

  it('says which piece has to move, then the square it stands on', () => {
    expect(said(bubble(en, 0))).toEqual([]);
    expect(said(bubble(en, 1))).toEqual(['The move is a knight. ']);
    expect(said(bubble(en, 2))).toEqual([
      'The move is a knight. ',
      'It starts on g1, marked on the board. ',
    ]);
  });

  it('says both in French, the square named so that its word agrees', () => {
    const host = bubble(fr, 2);
    expect(host.textContent).toContain('C’est un cavalier qui doit jouer.');
    expect(host.textContent).toContain('Il part de la case g1, marquée sur l’échiquier.');
    expect(labels(host)).toEqual(['Voir la réponse']);
  });

  it('draws the piece beside its name, in the board’s set', () => {
    const glyphs = bubble(en, 1).querySelectorAll('.ln-ext-bubble__sub .ln-ext-pc');
    expect(glyphs).toHaveLength(1);
  });
});

describe('the coach’s words while retrying', () => {
  it('are typed out word by word, as its comments are', () => {
    const { session, retry } = retrying(en, 0);
    const host = drawn(session, retry, { kind: 'waiting' });
    // "Find a better move for White.": nothing typed yet, then the words as they come.
    expect(host.querySelector('.ln-ext-bubble__title')?.textContent).toBe(
      'Find a better move for White. ',
    );
    expect(typedWords(host, '.ln-ext-bubble__title')).toEqual(Array(6).fill(false));
    session.stream.state = { ...session.stream.state, shown: 2 };
    const later = drawn(session, retry, { kind: 'waiting' });
    expect(typedWords(later, '.ln-ext-bubble__title')).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('type only a hint asked for, the line already said staying said', () => {
    const { session, retry } = retrying(en, 0);
    drawn(session, retry, { kind: 'waiting' });
    session.stream.state = { ...session.stream.state, shown: Infinity };
    retry.hints = 1;
    const host = drawn(session, retry, { kind: 'waiting' });
    expect(typedWords(host, '.ln-ext-bubble__title').every(Boolean)).toBe(true);
    expect(typedWords(host, '.ln-ext-bubble__sub')).toEqual([false, false, false, false, false]);
  });

  it('carry on with a line still being typed when a hint is asked for', () => {
    const { session, retry } = retrying(en, 0);
    drawn(session, retry, { kind: 'waiting' });
    session.stream.state = { ...session.stream.state, shown: 3 };
    retry.hints = 1;
    const host = drawn(session, retry, { kind: 'waiting' });
    expect(typedWords(host, '.ln-ext-bubble__title')).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(session.stream.state.shown).toBe(3);
  });

  it('start over on a new line, the hints typed again under it', () => {
    const { session, retry } = retrying(en, 1);
    drawn(session, retry, { kind: 'waiting' });
    session.stream.state = { ...session.stream.state, shown: Infinity };
    const host = drawn(session, retry, { kind: 'checking' });
    expect(session.stream.state.shown).toBe(0);
    expect(typedWords(host, '.ln-ext-bubble__title')).toEqual([false, false, false]);
    expect(typedWords(host, '.ln-ext-bubble__sub').some(Boolean)).toBe(false);
  });
});
