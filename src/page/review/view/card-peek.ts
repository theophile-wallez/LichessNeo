import { html, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS, type MoveClass } from '#page/review/classes/classes.ts';
import { classSvg } from '#page/review/classes/icon-svg.ts';
import type { Heading } from '#page/game-over/card.ts';

// The closed review's card, folded: a strip of it in the button that unfolds it
// (view/closed-panel.ts, review/card-fold.css), so that the fold still tells how
// the game went.

export interface PeekFigures {
  readonly accuracy: string;
  /** The class the card ends on, and its count. */
  readonly moveClass: MoveClass;
  readonly count: number;
}

export interface PeekInput {
  readonly heading: Heading;
  readonly coachId: number;
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

export function peekMarkup({ heading, coachId, figures }: PeekInput): SafeHtml {
  const tag =
    heading.tag === '' ? '' : html`<span class="ln-ext-end__peek-tag">${heading.tag}</span>`;
  return html`<span class="ln-ext-end__peek-coach" data-ln-ext-avatar-coach="${coachId}"></span>
    <span class="ln-ext-end__peek-words">${tag}<span class="ln-ext-end__peek-title">${heading.title}</span></span>
    ${figuresMarkup(figures)}`;
}
