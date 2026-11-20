import { html, type SafeHtml } from '#shared/html.ts';
import type { EngineKind } from './options.ts';
import {
  advancedMarkup,
  coreChipsMarkup,
  coresIcon,
  coresRowMarkup,
  curveMarkup,
  dialMarkup,
  engineIcon,
  engineRowMarkup,
  footMarkup,
  headIcon,
  kindSwitchMarkup,
  modMarkup,
  resetMarkup,
  stepperMarkup,
  toastMarkup,
  warningMarkup,
} from './panel-markup.ts';
import type { EngineWords } from './words.ts';

// The engine panel as the review's popover shows it, and as the settings'
// Analysis page does: the same parts, the page's in cards around a bigger curve.

/** The review's popover: what the game was analysed with, and a re-analysis. */
export const popoverLayout = (words: EngineWords): SafeHtml =>
  html`<div class="ln-ext-engine ln-ext-engine--popover">
    <div class="ln-ext-engine__head"><span class="ln-ext-engine__tile">${headIcon()}</span><div class="ln-ext-engine__head-text"><b>${words.title}</b><span data-ln-ext-bind="analysed"></span></div>${resetMarkup(words.reset)}</div>
    <div class="ln-ext-engine__body">
      <div>${dialMarkup(words, false)}${curveMarkup(words, false)}</div>
      <div>${engineRowMarkup(words)}</div>
      <div>${coresRowMarkup(words)}</div>
      ${advancedMarkup(words)}
    </div>
    ${footMarkup(words)}
  </div>`;

// Each engine's speed, accuracy and memory, out of five.
const METERS: Record<EngineKind, readonly [number, number, number]> = {
  light: [5, 3, 1],
  full: [3, 5, 2],
};

function metersMarkup(kind: EngineKind, words: EngineWords): SafeHtml {
  const names = [words.speed, words.accuracy, words.memory];
  const rows = METERS[kind].map(
    (lit, i) =>
      html`<span class="ln-ext-engine__meter"><span>${names[i] ?? ''}</span><span>${Array.from({ length: 5 }, (_, j) => html`<i class="${j < lit ? 'ln-ext-on' : ''}"></i>`)}</span></span>`,
  );
  return html`<div class="ln-ext-engine__meters" data-ln-ext-kind-meters="${kind}" data-ln-ext-when="${kind}" data-ln-ext-reveal="fade" hidden>${rows}<p class="ln-ext-engine__caption">${words.kindNotes[kind]}</p></div>`;
}

interface CardHead {
  readonly icon: SafeHtml;
  readonly hue: string;
  readonly title: SafeHtml;
  readonly body: string;
  readonly control: SafeHtml;
}

const cardHead = ({ icon, hue, title, body, control }: CardHead): SafeHtml =>
  html`<div class="ln-ext-engine__card-head"><span class="ln-ext-engine__tile" data-ln-ext-hue="${hue}">${icon}</span><div class="ln-ext-engine__card-text"><b>${title}</b><span>${body}</span></div>${control}</div>`;

/** The settings' Analysis page: the curve in its hero, the engine and the cores in cards. */
export const pageLayout = (words: EngineWords): SafeHtml =>
  html`<div class="ln-ext-engine ln-ext-engine--page">
    <div class="ln-ext-engine__hero">
      <div class="ln-ext-engine__hero-top">${dialMarkup(words, true)}${resetMarkup(words.resetAll)}</div>
      ${curveMarkup(words, true)}
    </div>
    <div class="ln-ext-engine__pair">
      <div class="ln-ext-engine__card">
        ${cardHead({ icon: engineIcon(), hue: 'pink', title: html`${words.engine} ${modMarkup('engine')}`, body: words.engineBody, control: kindSwitchMarkup(words) })}
        <div class="ln-ext-engine__stack">${metersMarkup('light', words)}${metersMarkup('full', words)}</div>
        ${toastMarkup()}
      </div>
      <div class="ln-ext-engine__card">
        ${cardHead({ icon: coresIcon(), hue: 'green', title: html`${words.cores} ${modMarkup('cores')}`, body: words.coresBody, control: stepperMarkup('cores', words) })}
        <div>${coreChipsMarkup()}<div class="ln-ext-engine__cores-legend"><span data-ln-ext-bind="suggestion"></span><span data-ln-ext-bind="device"></span></div></div>
        ${warningMarkup(words)}
      </div>
    </div>
    <div class="ln-ext-engine__card ln-ext-engine__card--flat">${advancedMarkup(words)}</div>
  </div>`;
