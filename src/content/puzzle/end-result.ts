import { createElement, queryOne, setData } from '#shared/dom.ts';
import { pageLocale } from '#shared/lang.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { message } from '#content/platform/runtime.ts';
import { parseRatingChange, type RatingChange } from './rating-change.ts';
import { readVerdict, type Verdict } from './verdict.ts';

// The line under a solved or failed puzzle's title on its end card
// (styles/puzzle/coach-card.css): first try or not, then the rating it gave,
// which Lichess shows only in its side card.

function buildResult(): HTMLElement {
  const element = createElement('div', { className: 'ln-ext-puzzle-result' });
  // The change and the new rating in one piece: the line wraps between it and the verdict.
  const change = createElement('span', { className: 'ln-ext-puzzle-result__change' });
  change.append(
    createElement('span', { className: 'ln-ext-puzzle-result__diff' }),
    createElement('span', { className: 'ln-ext-puzzle-result__rating' }),
  );
  element.append(createElement('span', { className: 'ln-ext-puzzle-result__verdict' }), change);
  return element;
}

const ownResult = createOwnedElement(buildResult);

// Built once a page: the sync runs every tick while the card shows.
interface NumberFormats {
  readonly plain: Intl.NumberFormat;
  readonly signed: Intl.NumberFormat;
}

let formats: NumberFormats | null = null;

function numberFormats(): NumberFormats {
  formats ??= {
    plain: new Intl.NumberFormat(pageLocale()),
    signed: new Intl.NumberFormat(pageLocale(), { signDisplay: 'exceptZero' }),
  };
  return formats;
}

function setText(element: Element | undefined, text: string): void {
  if (element && element.textContent !== text) element.textContent = text;
}

function drawResult(
  element: HTMLElement,
  verdict: Verdict | null,
  change: RatingChange | null,
): void {
  const [verdictChip, changeGroup] = element.children;
  const [diff, rating] = changeGroup?.children ?? [];
  setData(element, 'lnExtVerdict', verdict);
  setData(element, 'lnExtSign', change && (change.diff > 0 ? 'up' : 'down'));
  setText(
    verdictChip,
    verdict ? message(verdict === 'solved' ? 'puzzleSolved' : 'puzzleFailed') : '',
  );
  const { plain, signed } = numberFormats();
  setText(diff, change ? signed.format(change.diff) : '');
  setText(rating, change ? plain.format(change.rating) : '');
}

export function syncEndResult(): void {
  const main = queryOne(document, 'main.puzzle', HTMLElement);
  const feedback = main && queryOne(main, '.puzzle__feedback.after', HTMLElement);
  if (!main || !feedback) return;
  const verdict = readVerdict(main);
  const rating = queryOne(main, '.puzzle__side__user__rating strong', HTMLElement);
  const change = rating && parseRatingChange(rating.textContent);
  if (!verdict && !change) return;
  // In the card Lichess redraws, after its own nodes: gone with the card at the next puzzle.
  drawResult(ownResult(feedback).element, verdict, change);
}
