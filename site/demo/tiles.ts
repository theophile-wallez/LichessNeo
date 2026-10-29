import { queryAll, queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { en } from '#page/review/i18n/en.ts';
import { cardMarkup } from './card.ts';
import { graphMarkup } from './graph.ts';
import { commentOn, division, moves, records } from './review.ts';

// The review's tiles further down the page, drawn live from the demo's game
// rather than shown as pictures: the advantage graph, and the coach's cards on
// three of its moves, each by another coach, which words it its own way.

// The Opera Game's turn, its great reply, and its mate.
const CARDS: readonly { readonly san: string; readonly coach: number }[] = [
  { san: 'b5', coach: 2 },
  { san: 'Nxb5', coach: 21 },
  { san: 'Rd8#', coach: 5 },
];

export function drawTiles(): void {
  const graph = queryOne(document, '.tile-graph', HTMLElement);
  if (graph) setHtml(graph, graphMarkup(records, moves, division));
  const cards = queryOne(document, '.tile-cards', HTMLElement);
  if (!cards) return;
  setHtml(
    cards,
    html`${CARDS.map(({ san, coach }) => {
      const move = moves.find(entry => entry.san === san);
      if (!move) return html``;
      // Absolute: a URL in a variable would resolve against the sheet that reads it.
      const still = new URL(`img/coaches/mascot-${coach}.webp`, document.baseURI).href;
      return html`<div class="mini-card" data-class="${move.moveClass}"><span class="mini-card__coach" style="--still:url(${still})"></span><div class="demo-say">${cardMarkup(move, commentOn(move, coach, en), en)}</div></div>`;
    })}`,
  );
  // Shown whole: no coach types here.
  for (const word of queryAll(cards, '.ln-ext-w--off', HTMLElement)) word.className = 'ln-ext-w';
}
