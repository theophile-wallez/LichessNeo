import { html, type SafeHtml } from '#shared/html.ts';
import { pageLocale } from '#shared/lang.ts';
import { message } from '#content/platform/runtime.ts';
import { stepsWon, type Medal, type MedalId, type Metal } from './medals-model.ts';

// The medals' row (styles/profile/medals.css): a coin per family, its name,
// and its count against the next step; the tooltip names the metal.

const NAMES: Readonly<Record<MedalId, string>> = {
  games: 'medalGames',
  wins: 'medalWins',
  peak: 'medalPeak',
  puzzles: 'medalPuzzles',
  storm: 'medalStorm',
  streak: 'medalStreak',
  variants: 'medalVariants',
  veteran: 'medalVeteran',
  marathon: 'medalMarathon',
};

const METAL_NAMES: Readonly<Record<Metal, string>> = {
  bronze: 'medalBronze',
  silver: 'medalSilver',
  gold: 'medalGold',
  crystal: 'medalCrystal',
};

// Years and hours carry their unit, which Intl words and pluralizes.
const UNITS: Partial<Record<MedalId, Intl.NumberFormatOptions>> = {
  veteran: { style: 'unit', unit: 'year', unitDisplay: 'long' },
  marathon: { style: 'unit', unit: 'hour', unitDisplay: 'short' },
};

const count = (id: MedalId, value: number): string =>
  new Intl.NumberFormat(pageLocale(), UNITS[id]).format(value);

/** The count against the next step, the unit once: "7 / 10 years". */
function countText({ id, value, next }: Medal): string {
  if (next === null) return count(id, value);
  return `${new Intl.NumberFormat(pageLocale()).format(value)} / ${count(id, next)}`;
}

function tipText({ id, metal, next }: Medal): string {
  const won = message(metal === null ? 'medalLocked' : METAL_NAMES[metal]);
  const step = next === null ? message('medalTop') : message('medalNext', count(id, next));
  return `${message(NAMES[id])} · ${won} · ${step}`;
}

const medalMarkup = (medal: Medal, fresh: boolean): SafeHtml =>
  html`<div class="ln-ext-medal" data-ln-ext-medal="${medal.id}"
      data-ln-ext-metal="${medal.metal ?? 'none'}" ${fresh && html`data-ln-ext-new`}
      data-ln-ext-tip="${tipText(medal)}" style="--ln-ext-medal-p: ${medal.progress.toFixed(3)}">
    <span class="ln-ext-medal__coin" aria-hidden="true"><span class="ln-ext-medal__icon"></span></span>
    <b class="ln-ext-medal__name">${message(NAMES[medal.id])}</b>
    <span class="ln-ext-medal__count">${countText(medal)}</span>
    ${fresh && html`<span class="ln-ext-medal__new">${message('medalNew')}</span>`}
  </div>`;

/** The section's markup; `fresh` holds the medals won since the user last looked. */
export function medalsMarkup(list: readonly Medal[], fresh: ReadonlySet<MedalId>): SafeHtml {
  const { won, of } = stepsWon(list);
  return html`<div class="ln-ext-medals__head">
      <span class="ln-ext-medals__tile" aria-hidden="true"></span>
      <h2>${message('medalsTitle')}</h2>
      <span class="ln-ext-medals__won">${won} / ${of}</span>
    </div>
    <div class="ln-ext-medals__row">${list.map(medal => medalMarkup(medal, fresh.has(medal.id)))}</div>`;
}
