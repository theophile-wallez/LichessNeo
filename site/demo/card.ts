import { WORD_MS } from '#shared/coach-voice.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { classSvg } from '#page/review/classes/icon-svg.ts';
import { commentMarkup, commentKey } from '#page/review/comment/markup.ts';
import { verdictTitle } from '#page/review/comment/title.ts';
import { formatEval } from '#page/review/evaluation/format.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { DemoComment } from './review.ts';

// The coach's card for the move on the board, as the review's: the verdict
// and the score on top, then the comment, laid out whole and hidden, typed out
// word by word, the tactic's tags and the card's own buttons.

export function cardMarkup(
  move: MoveVerdict,
  comment: Pick<DemoComment, 'parts' | 'themes'>,
  language: ReviewLanguage,
  actions: SafeHtml = html``,
): SafeHtml {
  const stream = { key: commentKey(comment.parts), shown: 0, dropped: 0 };
  const tags = comment.themes.map(
    theme => html`<span class="demo-tag demo-tag--${theme}">${language.ui.themes[theme]}</span>`,
  );
  return html`<div class="demo-say__head">
      <span class="demo-say__icon">${classSvg(move.moveClass)}</span>
      <p class="demo-say__title">${verdictTitle(move.moveClass, move.san, language)}</p>
      <span class="demo-say__eval">${formatEval(move.after)}</span>
    </div>
    <p class="demo-say__words">${commentMarkup(comment.parts, { stream, language })}</p>
    ${tags.length > 0 ? html`<div class="demo-say__tags">${tags}</div>` : html``}${actions}`;
}

/** The card while Best shows the engine's move in place of the game's: its verdict and score. */
export const bestCardMarkup = (move: MoveVerdict, language: ReviewLanguage): SafeHtml =>
  html`<div class="demo-say__head">
      <span class="demo-say__icon">${classSvg('best')}</span>
      <p class="demo-say__title">${verdictTitle('best', move.bestSan, language)}</p>
      <span class="demo-say__eval">${formatEval(move.before)}</span>
    </div>`;

/** Types a card's hidden words out, one every WORD_MS, as the review's stream does. */
export class Typist {
  readonly #onTalking: (talking: boolean) => void;
  #timer = 0;

  constructor(onTalking: (talking: boolean) => void) {
    this.#onTalking = onTalking;
  }

  /** Types out the words under `root`, then calls `done`. */
  type(root: HTMLElement, done: () => void): void {
    this.stop();
    const words = [...root.querySelectorAll('.ln-ext-w--off')];
    let shown = 0;
    this.#onTalking(true);
    this.#timer = window.setInterval(() => {
      const word = words[shown++];
      if (word) word.className = 'ln-ext-w ln-ext-w--in';
      if (shown < words.length) return;
      this.stop();
      done();
    }, WORD_MS);
  }

  stop(): void {
    if (this.#timer === 0) return;
    clearInterval(this.#timer);
    this.#timer = 0;
    this.#onTalking(false);
  }
}
