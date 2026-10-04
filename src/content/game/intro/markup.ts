import { avatarAttributes } from '#shared/avatar.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import type { BarPlayer } from '#shared/player-bar.ts';

// The intro's cards over the board (styles/game/intro.css): the opponent's
// rides down on another board, the player's waits on their own half.

type Side = 'top' | 'bottom';

function card(player: BarPlayer, side: Side): SafeHtml {
  const kind = player.computer ? ' cdc-intro__card--computer' : '';
  const title =
    player.title === undefined ? '' : html`<span class="cdc-intro__title">${player.title}</span>`;
  const details = [player.rating, player.flag].filter(part => part !== undefined).join(' ');
  return html`<div class="cdc-intro__card cdc-intro__card--${side}${kind}">
    <span class="cdc-intro__avatar"${avatarAttributes(player.user)}></span>
    <span class="cdc-intro__who">
      <span class="cdc-intro__name">${title}<span class="cdc-intro__username">${player.name}</span></span>
      ${details === '' ? '' : html`<span class="cdc-intro__details">${details}</span>`}
    </span>
  </div>`;
}

export interface BarPlayers {
  readonly top: BarPlayer;
  readonly bottom: BarPlayer;
}

export const introMarkup = ({ top, bottom }: BarPlayers): SafeHtml =>
  html`<div class="cdc-intro__drop">${card(top, 'top')}</div>
    <div class="cdc-intro__stay">${card(bottom, 'bottom')}</div>
    <span class="cdc-intro__vs"><span class="cdc-intro__swords"></span><span class="cdc-intro__versus">VS</span></span>`;

// The dropped board's squares, light then dark, in colors no board of
// Lichess's has, so it stands out from the one under it.
const SQUARES: readonly [readonly [string, string], ...(readonly [string, string])[]] = [
  ['#dfe6f0', '#7d93b8'],
  ['#ece3f5', '#9277bd'],
  ['#f3dfcf', '#c07d5c'],
  ['#d9eeea', '#5f9e96'],
  ['#f2eccd', '#b29a4c'],
];

const DARK_SQUARES = Array.from({ length: 64 }, (_, i) => [i % 8, Math.floor(i / 8)])
  .filter(([x = 0, y = 0]) => (x + y) % 2 === 1)
  .map(([x, y]) => `M${x} ${y}h1v1h-1z`)
  .join('');

/** A CSS image of a board in one of SQUARES' colors, picked with `random` in [0, 1). */
export function introBoardImage(random: () => number): string {
  const index = Math.min(SQUARES.length - 1, Math.floor(random() * SQUARES.length));
  const [light, dark] = SQUARES[index] ?? SQUARES[0];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">` +
    `<rect width="8" height="8" fill="${light}"/><path fill="${dark}" d="${DARK_SQUARES}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
