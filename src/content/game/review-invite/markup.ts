import { monotoneCurve } from '#shared/charts/curve.ts';
import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { roundTenth } from '#shared/math.ts';
import type { ReviewCurve } from '#shared/protocol.ts';

// The invite's markup (styles/game/review-invite.css): the coach's place, its
// bubble with its word, the slot the game's curve comes into, and the way in.

export interface InviteTexts {
  /** The coach's word before the game is analysed. */
  readonly invite: string;
  /** Its word once the analysis found the move the game turned on. */
  readonly turned: (move: string) => SafeHtml;
  readonly note: string;
  readonly start: string;
}

const ENGLISH: InviteTexts = {
  invite: 'Want to see where the game was won and lost? I’ll walk you through it.',
  turned: move => html`It all turned on <b>${move}</b>. Want to see why?`,
  note: 'Free analysis by Stockfish',
  start: 'Start review',
};

const FRENCH: InviteTexts = {
  invite: 'On regarde où la partie s’est jouée ? Je te montre tout.',
  turned: move => html`Tout s’est joué sur <b>${move}</b>. On regarde pourquoi ?`,
  note: 'Analyse gratuite par Stockfish',
  start: 'Voir le bilan',
};

export const inviteTexts = (french: boolean): InviteTexts => (french ? FRENCH : ENGLISH);

export const inviteMarkup = (texts: InviteTexts): SafeHtml =>
  html`<div class="cdc-invite">
    <div class="cdc-invite__coach"></div>
    <div class="cdc-invite__bubble">
      <p class="cdc-invite__words">${texts.invite}</p>
      <div class="cdc-invite__curve"></div>
      <div class="cdc-invite__foot"><span class="cdc-invite__note">${texts.note}</span><a class="cdc-invite__go">${texts.start}</a></div>
    </div>
  </div>`;

// The curve's box in the SVG's units, stretched to the bubble's width.
const WIDTH = 300;
const HEIGHT = 40;

/** Where each known win chance goes in the curve's box, White's lead upward. */
export function curvePoints(whiteWinChances: readonly (number | null)[]): Point[] {
  const last = Math.max(1, whiteWinChances.length - 1);
  return whiteWinChances.flatMap((chance, i): Point[] =>
    chance === null ? [] : [[(i / last) * WIDTH, HEIGHT - (chance / 100) * HEIGHT]],
  );
}

/** The dot on the move the game turned on, placed in percent: the SVG is stretched. */
function turningDot({ whiteWinChances, turning }: Omit<ReviewCurve, 'gameId'>): SafeHtml | '' {
  const chance = turning ? whiteWinChances[turning.index] : null;
  if (!turning || typeof chance !== 'number') return '';
  const left = roundTenth((turning.index / Math.max(1, whiteWinChances.length - 1)) * 100);
  const top = roundTenth(100 - chance);
  return html`<span class="cdc-invite__dot" style="left:${left}%;top:${top}%"></span>`;
}

export function curveMarkup(curve: Omit<ReviewCurve, 'gameId'>): SafeHtml {
  const points = curvePoints(curve.whiteWinChances);
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return html``;
  const line = monotoneCurve(points);
  const area = `${line}L${roundTenth(last[0])},${HEIGHT}L${roundTenth(first[0])},${HEIGHT}Z`;
  return html`<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none" aria-hidden="true">
      <line class="cdc-invite__even" x1="0" x2="${WIDTH}" y1="${HEIGHT / 2}" y2="${HEIGHT / 2}"></line>
      <path class="cdc-invite__area" d="${area}"></path>
      <path class="cdc-invite__line" d="${line}"></path>
    </svg>${turningDot(curve)}`;
}
