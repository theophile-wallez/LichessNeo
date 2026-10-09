import { html, type SafeHtml } from '#shared/html.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';

// The verdict over the coach's comment ("Nf3 is best"), the move's piece as a
// solid figurine drawn by Lichess's "Noto Chess" font.

const FIGURINES: Readonly<Record<string, string>> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞' };

function sanMarkup(san: string): SafeHtml {
  // Split on the piece letters, which then sit at the odd indexes.
  const pieces = san
    .split(/([KQRBN])/)
    .map((text, i) =>
      i % 2 === 1
        ? html`<span class="lr-ext-fig">${FIGURINES[text] ?? text}</span>`
        : html`${text}`,
    );
  return html`${pieces}`;
}

export function verdictTitle(
  moveClass: MoveClass,
  san: string,
  language: ReviewLanguage,
): SafeHtml {
  const sentence = language.typography(language.classSentences[moveClass]);
  const at = sentence.indexOf('{m}');
  if (at < 0) return html`${sentence}`;
  return html`${sentence.slice(0, at)}${sanMarkup(san)}${sentence.slice(at + 3)}`;
}
