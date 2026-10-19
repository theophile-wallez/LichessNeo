import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { followRoad } from './racer-road.ts';

// Puzzle Racer's home: a scene where the cars race, with a pitch over
// Lichess's two buttons, then how a race goes and the other puzzle
// challenges. Lichess's nodes stay where they are: ours go beside them, and
// the page's grid lays them all out (styles/racer/home.css).

const SCENE = 'ln-ext-racer-scene';

// The racer font's vehicles: 0 the car, 1 the bus.
const CARS = ['0', '1', '0'] as const;

interface Card {
  readonly kind: string;
  readonly title: string;
  readonly body: string;
}

const STEPS: readonly Card[] = [
  { kind: 'same', title: 'racerStepSame', body: 'racerStepSameBody' },
  { kind: 'time', title: 'racerStepTime', body: 'racerStepTimeBody' },
  { kind: 'combo', title: 'racerStepCombo', body: 'racerStepComboBody' },
];

const MODES: readonly (Card & { readonly href: string })[] = [
  { kind: 'storm', href: '/storm', title: 'racerStorm', body: 'racerStormBody' },
  { kind: 'streak', href: '/streak', title: 'racerStreak', body: 'racerStreakBody' },
  { kind: 'themes', href: '/training/themes', title: 'racerThemes', body: 'racerThemesBody' },
];

const card = ({ title, body }: Card): SafeHtml =>
  html`<span class="ln-ext-racer-card__icon" aria-hidden="true"></span>
    <span class="ln-ext-racer-card__text"><b>${message(title)}</b><span>${message(body)}</span></span>`;

function sceneMarkup(): SafeHtml {
  const cars = CARS.map(car => html`<icon class="car">${car}</icon>`);
  return html`<div class="ln-ext-racer-scene__cars" aria-hidden="true">${cars}</div>`;
}

const copyMarkup = (): SafeHtml =>
  html`<h2>${message('racerTagline')}</h2>
    <p>${message('racerPitch')}</p>`;

function aboutMarkup(): SafeHtml {
  const steps = STEPS.map(
    step =>
      html`<div class="ln-ext-racer-card" data-ln-ext-racer="${step.kind}">${card(step)}</div>`,
  );
  const modes = MODES.map(
    mode =>
      html`<a class="ln-ext-racer-card" data-ln-ext-racer="${mode.kind}" href="${mode.href}">${card(mode)}</a>`,
  );
  return html`<div class="ln-ext-racer-steps">${steps}</div>
    <h2 class="ln-ext-racer-more__title">${message('racerMore')}</h2>
    <div class="ln-ext-racer-more">${modes}</div>`;
}

function part(className: string, markup: SafeHtml): HTMLElement {
  const element = createElement('div', { className });
  setHtml(element, markup);
  return element;
}

function syncRacerHome(): void {
  const main = queryOne(document, 'main.racer-home', HTMLElement);
  if (!main) return;
  let scene = queryOne(main, `:scope > .${SCENE}`, HTMLElement);
  if (!scene) {
    scene = part(SCENE, sceneMarkup());
    main.append(
      scene,
      part('ln-ext-racer-copy', copyMarkup()),
      part('ln-ext-racer-about', aboutMarkup()),
    );
  }
  // The scene may come in before Lichess's buttons, still being parsed.
  const buttons = queryOne(
    main,
    ':scope > .racer-home__buttons:not([data-ln-ext-road])',
    HTMLElement,
  );
  if (!buttons) return;
  setData(buttons, 'lnExtRoad', '');
  followRoad(buttons, scene);
}

export const racerHome: Feature = {
  name: 'racer home',
  start: () => {
    // As the page comes in: Lichess's buttons never show without the scene.
    syncWhileParsing(syncRacerHome);
    onEveryTick('racer home', syncRacerHome);
  },
};
