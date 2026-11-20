import type { CoachMood } from '#shared/coach.ts';
import { queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { CLASS_COLORS, type MoveClass } from '#page/review/classes/classes.ts';
import { classSvg } from '#page/review/classes/icon-svg.ts';
import type { Heading } from '#page/game-over/card.ts';

// The closed review's card, folded: a strip of it in the button that unfolds it
// (view/closed-panel.ts, review/card-fold.css), so that the fold still tells how
// the game went. Its coach stays the same element from one draw to the next, for
// the live mascot played in it (content/coach/peek.ts) to carry on.

export interface PeekFigures {
  readonly accuracy: string;
  /** The class the card ends on, and its count. */
  readonly moveClass: MoveClass;
  readonly count: number;
}

export interface PeekInput {
  readonly heading: Heading;
  readonly coachId: number;
  /** The card's coach's face, which its still can't show. */
  readonly mood: CoachMood;
  /** The figures once the analysis is done; until then, what stands in their place. */
  readonly figures: PeekFigures | string;
}

function figuresMarkup(figures: PeekFigures | string): SafeHtml {
  if (typeof figures === 'string')
    return html`<span class="ln-ext-end__peek-progress">${figures}</span>`;
  const { accuracy, moveClass, count } = figures;
  return html`<span class="ln-ext-end__peek-accuracy">${accuracy}</span>
    <span class="ln-ext-end__peek-count" style="--ln-ext-count-c:${CLASS_COLORS[moveClass]}">${classSvg(moveClass)}<b>${count}</b></span>`;
}

function wordsMarkup(heading: Heading): SafeHtml {
  const tag =
    heading.tag === '' ? '' : html`<span class="ln-ext-end__peek-tag">${heading.tag}</span>`;
  return html`${tag}<span class="ln-ext-end__peek-title">${heading.title}</span>`;
}

/** The strip's parts, empty, for `drawPeek` to fill. */
export const peekFrameMarkup = (): SafeHtml =>
  html`<span class="ln-ext-end__peek"><span class="ln-ext-end__peek-coach"></span><span class="ln-ext-end__peek-words"></span><span class="ln-ext-end__peek-figures"></span></span>`;

export function drawPeek(peek: HTMLElement, { heading, coachId, mood, figures }: PeekInput): void {
  const coach = queryOne(peek, '.ln-ext-end__peek-coach', HTMLElement);
  if (coach) {
    setData(coach, 'lnExtAvatarCoach', String(coachId));
    setData(coach, 'lnExtMood', mood);
  }
  const words = queryOne(peek, '.ln-ext-end__peek-words', HTMLElement);
  if (words) setHtml(words, wordsMarkup(heading));
  const figuresSlot = queryOne(peek, '.ln-ext-end__peek-figures', HTMLElement);
  if (figuresSlot) setHtml(figuresSlot, figuresMarkup(figures));
}
