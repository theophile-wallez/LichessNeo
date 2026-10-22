import { userInHref } from '#shared/avatar.ts';
import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { currentSettings } from '#content/settings/settings.ts';
import { askCard, cardSources, onCardSources, type CardData } from './sources.ts';
import { cardMarkup } from './view.ts';

// What the hover card says about a player besides Lichess's own fragment
// (view.ts), asked of Lichess only while the pointer is on their name.
// Lichess builds the card again on every hover, so our block goes back in on
// each of its passes, with whatever has been loaded by then.

const BLOCK = 'ln-ext-upt';
const NAME = '.upt__info__top > a.user-link';

/** The card the pointer last opened, and the player it's about. */
let shown: { readonly card: HTMLElement; readonly name: string } | null = null;

function dataOf(card: HTMLElement, name: string): CardData | null {
  const sources = cardSources(name);
  if (!sources) return null;
  return {
    ...sources,
    name,
    online: queryOne(card, `${NAME}.online`, HTMLAnchorElement) !== null,
    chesscom: currentSettings().chesscomRating,
    now: Date.now(),
  };
}

/** What the rows are drawn from: redrawing an unchanged block would wake the card's observer. */
const signatureOf = (data: CardData): string =>
  [
    data.name,
    data.online ? 'online' : '',
    data.chesscom ? 'chesscom' : '',
    data.history ? 'history' : '',
    data.stat ? 'stat' : '',
    data.games ? 'games' : '',
  ].join('|');

function draw(): void {
  if (!shown) return;
  const { card, name } = shown;
  const info = queryOne(card, '.upt__info', HTMLElement);
  if (!info) return;
  const block = queryOne(card, `.${BLOCK}`, HTMLElement);
  const data = dataOf(card, name);
  const markup = data && cardMarkup(data);
  if (!data || !markup) {
    block?.remove();
    return;
  }
  const signature = signatureOf(data);
  if (block?.dataset.lnExtCard === signature) return;
  const section = block ?? createElement('section', { className: BLOCK });
  setHtml(section, markup);
  setData(section, 'lnExtCard', signature);
  if (!block) info.after(section);
}

/** Called as Lichess draws the card: puts our rows back, and asks for what's missing. */
export function syncPlayerCard(card: HTMLElement): void {
  const link = queryOne(card, NAME, HTMLAnchorElement);
  const name = userInHref(link?.getAttribute('href'))?.toLowerCase();
  // The computer, or a player with no account.
  if (name === undefined) {
    shown = null;
    return;
  }
  shown = { card, name };
  draw();
  askCard({
    name,
    // Hovered in passing, the card is already hidden again: its details can wait.
    stays: () => shown?.name === name && getComputedStyle(card).visibility === 'visible',
  });
}

export const playerCard: Feature = {
  name: 'player card',
  start: () => onCardSources(draw),
};
