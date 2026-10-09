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
  if (!paths) return html`<div class="lr-ext-speed__curve lr-ext-speed__curve--empty"></div>`;
  const fill = `lr-ext-speed-fill-${speed}`;
  return html`<svg class="lr-ext-speed__curve" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="${fill}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" class="lr-ext-speed__stop" />
        <stop offset="1" class="lr-ext-speed__stop lr-ext-speed__stop--end" />
      </linearGradient>
    </defs>
    <path class="lr-ext-speed__area" d="${paths.area}" fill="url(#${fill})" />
    <path class="lr-ext-speed__line" d="${paths.line}" />
  </svg>`;
}

function rating(card: Card, texts: SpeedTexts): SafeHtml {
  if (card.games === 0)
    return html`<div class="lr-ext-speed__rating lr-ext-speed__rating--none">–</div>`;
  return html`<div class="lr-ext-speed__rating">
    ${LOCALE_NUMBER.format(Math.round(card.rating))}
    ${card.provisional && html`<small>${texts.provisional}</small>`}
  </div>`;
}

function pools(speed: CardSpeed, last: string | undefined): SafeHtml {
  return html`<div class="lr-ext-speed__pools">
    ${POOLS[speed].map(
      id =>
        html`<button type="button" class="lr-ext-speed__pool${id === last ? ' lr-ext-speed__pool--last' : ''}" data-lr-ext-pool="${id}">
          ${poolLabel(id)}
        </button>`,
    )}
  </div>`;
}

interface CardsOptions {
  /** The player's numbers, null signed out. */
  readonly cards: readonly Card[] | null;
  readonly texts: SpeedTexts;
  readonly user: string | undefined;
}

function card(speed: CardSpeed, { cards, texts, user }: CardsOptions): SafeHtml {
  const numbers = user === undefined ? undefined : cards?.find(each => each.speed === speed);
  // Signed in, the games and the rating lead to the speed's stats page.
  const stats = `/@/${encodeURIComponent(user ?? '')}/perf/${speed}`;
  // The rating's color on every chart of ours.
  const color = `--lr-ext-speed-color: ${gameRatingColor(speed)}`;
  return html`<article class="lr-ext-speed" data-lr-ext-speed="${speed}" style="${color}">
    <div class="lr-ext-speed__top">
      <span class="lr-ext-speed__name"><span>${texts.names[speed]}</span></span>
      ${numbers && html`<a class="lr-ext-speed__games" href="${stats}">${texts.games(numbers.games)}</a>`}
    </div>
    ${
      numbers &&
      html`<a class="lr-ext-speed__stats" href="${stats}">
      ${rating(numbers, texts)} ${curve(speed, numbers.history)}
    </a>`
    }
    ${pools(speed, numbers?.last)}
  </article>`;
}

/** The cards: with a player's numbers when signed in, only the pools otherwise. */
export const cardsMarkup = (options: CardsOptions): SafeHtml =>
  html`${CARD_SPEEDS.map(speed => card(speed, options))}`;

/** The section's frame, its cards drawn into `.lr-ext-speeds__cards`. */
export const sectionMarkup = (texts: SpeedTexts): SafeHtml =>
  html`<div class="lr-ext-speeds__head">
      <h2 class="lr-ext-speeds__title"></h2>
      <button type="button" class="lr-ext-speeds__custom">
        ${SETTINGS_ICON}<span>${texts.custom}</span>${CHEVRON_ICON}
      </button>
    </div>
    <div class="lr-ext-speeds__cards"></div>`;
