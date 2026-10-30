import { queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { en } from '#page/review/i18n/en.ts';
import { cardMarkup } from './card.ts';
import { graphMarkup } from './graph.ts';
import { CardFeed } from './feed.ts';
import { commentOn, division, moves, records } from './review.ts';

// The review's tiles further down the page, drawn live from the demo's game
// rather than shown as pictures: the advantage graph, and a feed of the coach's
// cards on the game's turning points, each by another coach, which words it its
// own way.

// The Opera Game's moves worth a card, in order, each with its coach.
const CARDS: readonly { readonly san: string; readonly coach: number }[] = [
  { san: 'Nf6', coach: 9 },
  { san: 'Qb3', coach: 14 },
  { san: 'b5', coach: 2 },
  { san: 'Nxb5', coach: 21 },
  { san: 'cxb5', coach: 17 },
  { san: 'Nbd7', coach: 1 },
  { san: 'Rd1', coach: 24 },
  { san: 'Qb8+', coach: 11 },
  { san: 'Rd8#', coach: 5 },
];

function drawCard(san: string, coach: number): HTMLElement | null {
  const move = moves.find(entry => entry.san === san);
  if (!move) return null;
  const card = document.createElement('div');
  card.className = 'mini-card';
  card.dataset.class = move.moveClass;
  // Absolute: a URL in a variable would resolve against the sheet that reads it.
  const still = new URL(`img/coaches/mascot-${coach}.webp`, document.baseURI).href;
  setHtml(
    card,
    html`<span class="mini-card__coach" style="--still:url(${still})"></span><div class="demo-say">${cardMarkup(move, commentOn(move, coach, en), en)}</div>`,
  );
  return card;
}

export function drawTiles(): void {
  const graph = queryOne(document, '.tile-graph', HTMLElement);
  if (graph) setHtml(graph, graphMarkup(records, moves, division));
  const feed = queryOne(document, '.tile-cards', HTMLElement);
  if (!feed) return;
  const cards = CARDS.map(
    ({ san, coach }) =>
      () =>
        drawCard(san, coach),
  );
  new CardFeed(feed, cards).start();
}
