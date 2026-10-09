import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import Settings01Icon from '@hugeicons/core-free-icons/Settings01Icon';
import { gameRatingColor } from '#shared/charts/colors.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { curvePaths } from './curve.ts';
import type { Card } from './data.ts';
import { CARD_SPEEDS, poolLabel, POOLS, type CardSpeed } from './pools.ts';
import type { SpeedTexts } from './texts.ts';

// The speed cards' markup (styles/home/speed-cards.css): a heading with the
// custom game's pill, then a card per speed with its rating, its curve and
// its pools, the last one played as the primary button.

const SETTINGS_ICON = hugeicon(Settings01Icon);
const CHEVRON_ICON = hugeicon(ArrowRight01Icon);

const LOCALE_NUMBER = new Intl.NumberFormat(document.documentElement.lang || undefined);

function curve(speed: CardSpeed, ratings: readonly number[]): SafeHtml {
  const paths = curvePaths(ratings);
  if (!paths) return html`<div class="cdc-speed__curve cdc-speed__curve--empty"></div>`;
  const fill = `cdc-speed-fill-${speed}`;
  return html`<svg class="cdc-speed__curve" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="${fill}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" class="cdc-speed__stop" />
        <stop offset="1" class="cdc-speed__stop cdc-speed__stop--end" />
      </linearGradient>
    </defs>
    <path class="cdc-speed__area" d="${paths.area}" fill="url(#${fill})" />
    <path class="cdc-speed__line" d="${paths.line}" />
  </svg>`;
}

function rating(card: Card, texts: SpeedTexts): SafeHtml {
  if (card.games === 0) return html`<div class="cdc-speed__rating cdc-speed__rating--none">–</div>`;
  return html`<div class="cdc-speed__rating">
    ${LOCALE_NUMBER.format(Math.round(card.rating))}
    ${card.provisional && html`<small>${texts.provisional}</small>`}
  </div>`;
}

function pools(speed: CardSpeed, last: string | undefined): SafeHtml {
  return html`<div class="cdc-speed__pools">
    ${POOLS[speed].map(
      id =>
        html`<button type="button" class="cdc-speed__pool${id === last ? ' cdc-speed__pool--last' : ''}" data-cdc-pool="${id}">
          ${poolLabel(id)}
        </button>`,
    )}
  </div>`;
}

function card(speed: CardSpeed, played: Card | undefined, texts: SpeedTexts): SafeHtml {
  // The rating's color on every chart of ours.
  const color = `--cdc-speed-color: ${gameRatingColor(speed)}`;
  return html`<article class="cdc-speed" data-cdc-speed="${speed}" style="${color}">
    <div class="cdc-speed__top">
      <span class="cdc-speed__name"><span>${texts.names[speed]}</span></span>
      ${played && html`<span class="cdc-speed__games">${texts.games(played.games)}</span>`}
    </div>
    ${played && [rating(played, texts), curve(speed, played.history)]}
    ${pools(speed, played?.last)}
  </article>`;
}

/** The cards: with a player's numbers when signed in, only the pools otherwise. */
export function cardsMarkup(cards: readonly Card[] | null, texts: SpeedTexts): SafeHtml {
  return html`${CARD_SPEEDS.map(speed =>
    card(
      speed,
      cards?.find(played => played.speed === speed),
      texts,
    ),
  )}`;
}

/** The section's frame, its cards drawn into `.cdc-speeds__cards`. */
export const sectionMarkup = (texts: SpeedTexts): SafeHtml =>
  html`<div class="cdc-speeds__head">
      <h2 class="cdc-speeds__title"></h2>
      <button type="button" class="cdc-speeds__custom">
        ${SETTINGS_ICON}<span>${texts.custom}</span>${CHEVRON_ICON}
      </button>
    </div>
    <div class="cdc-speeds__cards"></div>`;
