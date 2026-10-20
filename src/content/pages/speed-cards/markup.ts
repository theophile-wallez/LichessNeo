import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import Edit02Icon from '@hugeicons/core-free-icons/Edit02Icon';
import Settings01Icon from '@hugeicons/core-free-icons/Settings01Icon';
import { gameRatingColor } from '#shared/charts/colors.ts';
import { clockLabel, type CustomSeek, type SeekPerf } from '#shared/custom-seek.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { settingsUrl } from '#content/settings/address.ts';
import { curvePaths } from './curve.ts';
import type { Card } from './data.ts';
import { perfOfCard, poolOfSeek, seekKey, seeksOf, type CardPick } from './picks.ts';
import { poolLabel, POOLS, type CardSpeed } from './pools.ts';
import type { SpeedTexts } from './texts.ts';

// The cards' markup (styles/home/speed-cards.css): a heading with the custom
// game's pill, then the cards the settings pick, each with its rating and its
// curve. A speed's has its pools, the last one played as the primary button; a
// game of the player's own has one button, which seeks it.

const SETTINGS_ICON = hugeicon(Settings01Icon);
const CHEVRON_ICON = hugeicon(ArrowRight01Icon);
const EDIT_ICON = hugeicon(Edit02Icon);

const LOCALE_NUMBER = new Intl.NumberFormat(document.documentElement.lang || undefined);

function curve(index: number, ratings: readonly number[]): SafeHtml {
  const paths = curvePaths(ratings);
  if (!paths) return html`<div class="ln-ext-speed__curve ln-ext-speed__curve--empty"></div>`;
  const fill = `ln-ext-speed-fill-${index}`;
  return html`<svg class="ln-ext-speed__curve" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="${fill}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" class="ln-ext-speed__stop" />
        <stop offset="1" class="ln-ext-speed__stop ln-ext-speed__stop--end" />
      </linearGradient>
    </defs>
    <path class="ln-ext-speed__area" d="${paths.area}" fill="url(#${fill})" />
    <path class="ln-ext-speed__line" d="${paths.line}" />
  </svg>`;
}

function rating(card: Card, texts: SpeedTexts): SafeHtml {
  if (card.games === 0)
    return html`<div class="ln-ext-speed__rating ln-ext-speed__rating--none">–</div>`;
  return html`<div class="ln-ext-speed__rating">
    ${LOCALE_NUMBER.format(Math.round(card.rating))}
    ${
      card.provisional &&
      html`<small class="ln-ext-speed__provisional" title="${texts.provisional}" aria-label="${texts.provisional}">?</small>`
    }
  </div>`;
}

function pools(speed: CardSpeed, last: string | undefined): SafeHtml {
  return html`<div class="ln-ext-speed__pools">
    ${POOLS[speed].map(
      id =>
        html`<button type="button" class="ln-ext-speed__pool${id === last ? ' ln-ext-speed__pool--last' : ''}" data-ln-ext-pool="${id}">
          ${poolLabel(id)}
        </button>`,
    )}
  </div>`;
}

interface CardsOptions {
  /** The cards the settings pick, in their order. */
  readonly picks: readonly CardPick[];
  /** The player's numbers, null signed out. */
  readonly cards: readonly Card[] | null;
  readonly texts: SpeedTexts;
  readonly user: string | undefined;
}

interface Frame {
  readonly perf: SeekPerf;
  readonly index: number;
  /** Its games don't count for the rating. */
  readonly casual?: boolean;
  readonly buttons: (numbers: Card | undefined) => SafeHtml;
}

function frame(
  { perf, index, buttons, casual = false }: Frame,
  { cards, texts, user }: CardsOptions,
): SafeHtml {
  const numbers = user === undefined ? undefined : cards?.find(each => each.perf === perf);
  // Signed in, the games and the rating lead to the rating's stats page.
  const stats = `/@/${encodeURIComponent(user ?? '')}/perf/${perf}`;
  // The rating's color on every chart of ours.
  const color = `--ln-ext-speed-color: ${gameRatingColor(perf)}`;
  return html`<article class="ln-ext-speed" data-ln-ext-speed="${perf}" style="${color}">
    <div class="ln-ext-speed__top">
      <span class="ln-ext-speed__name"><span>${texts.names[perf]}</span>${
        casual && html`<small class="ln-ext-speed__casual">${texts.casual}</small>`
      }</span>
      ${numbers && html`<a class="ln-ext-speed__games" href="${stats}">${texts.games(numbers.games)}</a>`}
    </div>
    ${
      numbers &&
      html`<a class="ln-ext-speed__stats" href="${stats}">
      ${rating(numbers, texts)} ${curve(index, numbers.history)}
    </a>`
    }
    ${buttons(numbers)}
  </article>`;
}

// Its pool if one plays it, so it's joined as the speed cards' are; else a seek of its own.
function seekButton(seek: CustomSeek, signedIn: boolean, main: boolean): SafeHtml {
  const pool = poolOfSeek(seek, signedIn);
  const target = pool
    ? html`data-ln-ext-pool="${pool}"`
    : html`data-ln-ext-card="${seekKey(seek)}"`;
  return html`<button type="button" class="ln-ext-speed__pool${main ? ' ln-ext-speed__pool--main' : ''}" ${target}>
    ${clockLabel(seek.minutes, seek.increment)}
  </button>`;
}

function pickCard(pick: CardPick, index: number, options: CardsOptions): SafeHtml {
  if ('speed' in pick) {
    const { speed } = pick;
    return frame({ perf: speed, index, buttons: numbers => pools(speed, numbers?.last) }, options);
  }
  const signedIn = options.user !== undefined;
  const seeks = seeksOf(pick.custom);
  // Its first time control is its own game, the primary button.
  const buttons = (): SafeHtml =>
    html`<div class="ln-ext-speed__pools">
      ${seeks.map((seek, at) => seekButton(seek, signedIn, at === 0))}
    </div>`;
  const casual = !(pick.custom.rated && signedIn);
  return frame({ perf: perfOfCard(pick.custom), index, buttons, casual }, options);
}

/** The cards: with a player's numbers when signed in, only the buttons otherwise. */
export const cardsMarkup = (options: CardsOptions): SafeHtml =>
  html`${options.picks.map((pick, index) => pickCard(pick, index, options))}`;

/** The section's frame, its cards drawn into `.ln-ext-speeds__cards`; signed in, a link to their settings. */
export const sectionMarkup = (texts: SpeedTexts, signedIn: boolean): SafeHtml =>
  html`<div class="ln-ext-speeds__head">
      <h2 class="ln-ext-speeds__title"></h2>
      <div class="ln-ext-speeds__tools">
        ${
          signedIn &&
          html`<a class="ln-ext-speeds__edit" href="${settingsUrl('pairing')}" aria-label="${texts.edit}">${EDIT_ICON}<span>${texts.edit}</span></a>`
        }
        <button type="button" class="ln-ext-speeds__custom">
          ${SETTINGS_ICON}<span>${texts.custom}</span>${CHEVRON_ICON}
        </button>
      </div>
      <div class="ln-ext-speeds__seeking" aria-live="polite">
        <span class="ln-ext-speeds__seeking-text"></span>
        <button type="button" class="ln-ext-speeds__cancel" data-ln-ext-pool="">${texts.cancel}</button>
      </div>
    </div>
    <div class="ln-ext-speeds__cards"></div>`;
