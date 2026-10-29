import { avatarOf } from '#shared/avatar.ts';
import { parseFen } from '#shared/chess/index.ts';
import type { Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { capturedMarkup, type MaterialPiece } from '#content/game/material.ts';
import { playedLike } from './rating.ts';

// The bars over and under the demo's board, as the extension draws a
// player's (styles/playerbar.css): an avatar of a coach on a color, picked
// from the name as the extension picks it (#shared/avatar.ts), the name, the
// flag and the rating, the rating each side played at here; and under the
// name, the pieces taken and the lead (content/game/material.ts).

interface Player {
  readonly name: string;
  readonly flags: readonly string[];
}

const PLAYERS: Readonly<Record<Color, Player>> = {
  white: { name: 'Paul Morphy', flags: ['us'] },
  // The duke of Brunswick and the count Isouard, in their box at the opera.
  black: { name: 'Duke Karl and Count Isouard', flags: ['de', 'fr'] },
};

export const PLAYER_NAMES: Readonly<Record<Color, string>> = {
  white: PLAYERS.white.name,
  black: PLAYERS.black.name,
};

export function playerMarkup(color: Color): SafeHtml {
  const { name, flags } = PLAYERS[color];
  const avatar = avatarOf(name);
  const rating = playedLike(color);
  // Absolute: a URL in a variable would resolve against the sheet that reads it.
  const still = new URL(`img/coaches/mascot-${avatar.coach}.webp`, document.baseURI).href;
  return html`<span class="demo-avatar" data-color="${avatar.color}" style="--avatar-coach:url(${still})"></span>
    <span class="demo-player__line"><b class="demo-name">${name}</b>${flags.map(flag => html`<i class="demo-flag demo-flag--${flag}"></i>`)}${rating === null ? '' : html`<span class="demo-rating" data-lichess="${rating.lichess}" data-chesscom="${rating.chesscom}">${rating.lichess}</span>`}</span>
    <span class="demo-captured"></span>`;
}

/** The pieces on the board of `fen`, kings aside, as material.ts counts them. */
function piecesOf(fen: string): MaterialPiece[] {
  const pieces: MaterialPiece[] = [];
  for (const piece of parseFen(fen).board.values())
    if (piece.role !== 'king') pieces.push({ color: piece.color, role: piece.role });
  return pieces;
}

/** Each bar's captured pieces for `fen`: Black's bar on top, White at the bottom. */
export const capturedOf = (fen: string): Readonly<Record<'top' | 'bottom', SafeHtml>> =>
  capturedMarkup({
    pieces: piecesOf(fen),
    bottom: 'white',
    variant: undefined,
    checks: { top: 0, bottom: 0 },
  });
