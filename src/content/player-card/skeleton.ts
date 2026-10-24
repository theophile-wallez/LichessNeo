import { html, type SafeHtml } from '#shared/html.ts';
import { FORM_GAMES } from './facts.ts';

// The hover card's rows while Lichess hasn't answered for them: bones as tall
// as the row that takes their place, so the card keeps its size as it loads
// (styles/powertip/skeleton.css). Bones are `<i>`, which none of the rows'
// own rules (`> span`) style.

// A space that doesn't collapse: it gives a text bone its line's height.
const LINE = '\u00a0';

/** A bone as tall as a line of the row's text, and as wide as its text tends to be. */
const textBone = (width: number): SafeHtml =>
  html`<i class="ln-ext-upt__bone ln-ext-upt__bone--text" style="width: ${width}px">${LINE}</i>`;

export const curveBone = (): SafeHtml =>
  html`<i class="ln-ext-upt__curve ln-ext-upt__bone" aria-hidden="true"></i>`;

export const standingBone = (): SafeHtml =>
  html`<div class="ln-ext-upt__facts" aria-hidden="true">${textBone(150)}</div>`;

export const formBone = (): SafeHtml =>
  html`<div class="ln-ext-upt__form" aria-hidden="true">
    ${Array.from({ length: FORM_GAMES }, () => html`<i class="ln-ext-upt__dot ln-ext-upt__bone"></i>`)}
  </div>`;

export const bestWinBone = (): SafeHtml =>
  html`<div class="ln-ext-upt__best" aria-hidden="true">${textBone(170)}</div>`;

/** Every row, while the profile itself is on its way. */
export const cardSkeleton = (): SafeHtml =>
  html`<div class="ln-ext-upt__meta" aria-hidden="true">${textBone(190)}</div>
    <div class="ln-ext-upt__headline" aria-hidden="true">${textBone(130)}${curveBone()}</div>
    ${standingBone()}
    <div class="ln-ext-upt__bar" aria-hidden="true"><i class="ln-ext-upt__bone"></i></div>
    <div class="ln-ext-upt__legend" aria-hidden="true">${textBone(200)}</div>
    ${formBone()}
    ${bestWinBone()}`;
