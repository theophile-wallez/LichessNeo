import { html, type SafeHtml } from '#shared/html.ts';

// The demo's own words; the coach's comments are the review's
// (src/page/review/i18n/en.ts).

const INTRO_TITLE = 'Paris, 1858';
const INTRO =
  'Morphy takes on a duke and a count, in their box at the opera. Let’s see how it goes!';

/** The coach's card before the first move: its words hidden, to be typed out. */
export function introMarkup(): SafeHtml {
  const spans = (INTRO.match(/\S+\s*/g) ?? []).map(
    word => html`<span class="ln-ext-w ln-ext-w--off">${word}</span>`,
  );
  return html`<div class="demo-say__head"><p class="demo-say__title">${INTRO_TITLE}</p></div>
    <p class="demo-say__words">${spans}</p>`;
}
