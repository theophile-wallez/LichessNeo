import {
  EndAnimationSchema,
  EndResultsSchema,
  type EndAnimation,
  type EndResults,
} from '#shared/end-animation.ts';
import { closestTo, queryAll, queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { INTRO_KINDS, IntroKindSchema, type IntroKind } from '#content/game/intro/kinds.ts';
import { WinColorSchema, type WinColor } from '#content/board-wave/win-colors.ts';
import type { Settings } from './settings.ts';

// The lists of the game animations' card (animations-card.ts): the intros at a
// game's start, then what plays at its end, after which results, and a win's
// wave's colours. Each option is a radio named after the setting it picks.

export type Choice =
  | { readonly key: 'gameIntro'; readonly value: IntroKind }
  | { readonly key: 'endAnimation'; readonly value: EndAnimation }
  | { readonly key: 'endResults'; readonly value: EndResults }
  | { readonly key: 'endWinColor'; readonly value: WinColor };

const INTRO_NAMES: Readonly<Record<IntroKind, string>> = {
  off: 'introOff',
  ripple: 'introRipple',
  salute: 'introSalute',
  setup: 'introSetup',
  march: 'introMarch',
  weave: 'introWeave',
  wave: 'introWave',
  ticket: 'introTicket',
  camps: 'introCamps',
  credits: 'introCredits',
  faceoff: 'introFaceOff',
};

/** Intros tagged as new in the list, until the next ones come. */
const NEW_INTROS: ReadonlySet<IntroKind> = new Set(['ripple']);

const END_NAMES: Readonly<Record<EndAnimation, string>> = {
  none: 'endAnimationNone',
  wave: 'endAnimationWave',
  confetti: 'endAnimationConfetti',
};

const RESULTS_NAMES: Readonly<Record<EndResults, string>> = {
  win: 'endResultsWin',
  notLoss: 'endResultsNotLoss',
  all: 'endResultsAll',
};

const WIN_COLOR_NAMES: Readonly<Record<WinColor, string>> = {
  rainbow: 'winColorRainbow',
  green: 'winColorGreen',
  ocean: 'winColorOcean',
  sunset: 'winColorSunset',
  accent: 'winColorAccent',
};

export const OPTION = '.ln-ext-intro-option';
const RESULTS_TITLE = 'ln-ext-setting-endResults';
const WIN_COLOR_TITLE = 'ln-ext-setting-endWinColor';
const WIN_COLORS = '.ln-ext-intro-picker__win';

function optionMarkup(key: Choice['key'], value: string, label: string, fresh = false): SafeHtml {
  return html`<label class="ln-ext-intro-option">
    <input type="radio" name="ln-ext-${key}" value="${value}" /><span>${label}</span>${
      fresh && html`<span class="ln-ext-intro-option__new">${message('introNew')}</span>`
    }
  </label>`;
}

// A swatch of the wave's colours (styles/pages/settings-intro.css), its name for screen readers.
const swatchMarkup = (color: WinColor): SafeHtml => {
  const name = message(WIN_COLOR_NAMES[color]);
  return html`<label class="ln-ext-intro-option ln-ext-intro-swatch" data-ln-ext-win-color="${color}" title="${name}">
    <input type="radio" name="ln-ext-endWinColor" value="${color}" aria-label="${name}" />
  </label>`;
};

/** The intros, "No animation" first; `titleId` names the card. */
export const introListMarkup = (titleId: string): SafeHtml =>
  html`<div class="ln-ext-intro-picker__list" data-ln-ext-panel="start" role="radiogroup" aria-labelledby="${titleId}">
    ${INTRO_KINDS.map(kind =>
      optionMarkup('gameIntro', kind, message(INTRO_NAMES[kind]), NEW_INTROS.has(kind)),
    )}
  </div>`;

/** What plays at the end, then after which results, hidden until its tab is picked. */
export const endListMarkup = (titleId: string): SafeHtml =>
  html`<div class="ln-ext-intro-picker__list" data-ln-ext-panel="end" hidden>
    <div class="ln-ext-intro-picker__group" role="radiogroup" aria-labelledby="${titleId}">
      ${EndAnimationSchema.options.map(pick => optionMarkup('endAnimation', pick, message(END_NAMES[pick])))}
    </div>
    <h3 class="ln-ext-intro-picker__caption" id="${RESULTS_TITLE}">${message('endResultsTitle')}</h3>
    <div class="ln-ext-intro-picker__group" role="radiogroup" aria-labelledby="${RESULTS_TITLE}">
      ${EndResultsSchema.options.map(results =>
        optionMarkup('endResults', results, message(RESULTS_NAMES[results])),
      )}
    </div>
    <div class="ln-ext-intro-picker__win">
      <h3 class="ln-ext-intro-picker__caption" id="${WIN_COLOR_TITLE}">${message('winColorTitle')}</h3>
      <div class="ln-ext-intro-picker__swatches" role="radiogroup" aria-labelledby="${WIN_COLOR_TITLE}">
        ${WinColorSchema.options.map(swatchMarkup)}
      </div>
    </div>
  </div>`;

const PARSERS = new Map<string, (value: string) => Choice | undefined>([
  [
    'ln-ext-gameIntro',
    value => {
      const kind = IntroKindSchema.safeParse(value).data;
      return kind === undefined ? undefined : { key: 'gameIntro', value: kind };
    },
  ],
  [
    'ln-ext-endAnimation',
    value => {
      const pick = EndAnimationSchema.safeParse(value).data;
      return pick === undefined ? undefined : { key: 'endAnimation', value: pick };
    },
  ],
  [
    'ln-ext-endResults',
    value => {
      const results = EndResultsSchema.safeParse(value).data;
      return results === undefined ? undefined : { key: 'endResults', value: results };
    },
  ],
  [
    'ln-ext-endWinColor',
    value => {
      const color = WinColorSchema.safeParse(value).data;
      return color === undefined ? undefined : { key: 'endWinColor', value: color };
    },
  ],
]);

/** The choice of the option `target` is in, if any. */
export function choiceOf(target: EventTarget | null): Choice | undefined {
  const option = closestTo(target, OPTION, HTMLElement);
  const input = option && queryOne(option, 'input', HTMLInputElement);
  return input ? PARSERS.get(input.name)?.(input.value) : undefined;
}

/** Checks each list's option the settings pick; with no end animation, its results are off, and its colours show with the wave only. */
export function showChoices(root: HTMLElement, settings: Settings): void {
  const picked = new Map<string, string>([
    ['ln-ext-gameIntro', settings.gameIntro],
    ['ln-ext-endAnimation', settings.endAnimation],
    ['ln-ext-endResults', settings.endResults],
    ['ln-ext-endWinColor', settings.endWinColor],
  ]);
  const colors = queryOne(root, WIN_COLORS, HTMLElement);
  const noWave = settings.endAnimation !== 'wave';
  if (colors && colors.hidden !== noWave) colors.hidden = noWave;
  const noEnd = settings.endAnimation === 'none';
  for (const input of queryAll(root, `${OPTION} input`, HTMLInputElement)) {
    const checked = input.value === picked.get(input.name);
    if (input.checked !== checked) input.checked = checked;
    const disabled = noEnd && input.name === 'ln-ext-endResults';
    if (input.disabled !== disabled) input.disabled = disabled;
    const option = closestTo(input, OPTION, HTMLElement);
    option?.classList.toggle('active', checked);
    option?.classList.toggle('disabled', disabled);
  }
}
