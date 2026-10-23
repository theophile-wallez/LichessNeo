import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import { chesscomShown } from '#shared/chesscom-rating/shown.ts';
import { avatarAttributes } from '#shared/own-avatar.ts';
import { shownName } from '#shared/own-name.ts';
import { COLORS, type Color } from '#shared/chess/types.ts';
import { queryAll, setData } from '#shared/dom.ts';
import { html, type SafeHtml, trustedHtml } from '#shared/html.ts';
import type { Player } from '#page/lichess/analysis.ts';
import type { InterfaceStrings, ReviewLanguage } from '#page/review/i18n/types.ts';
import type { Review } from '#page/review/session.ts';

// The summary's two players side by side, each in its side's color: the
// accuracy, large, and the rating the game was played at, as on Chess.com
// with the settings' Chess.com ratings on. Pointing at one dims the other
// side's colors through the whole summary.

const NBSP = trustedHtml('&nbsp;');

export function playerName(player: Player | undefined, language: ReviewLanguage): string {
  if (player?.user?.username) return shownName(player.user.username);
  if (player?.name) return player.name;
  return player?.ai ? `Stockfish ${player.ai}` : language.ui.anonymous;
}

export interface PlayersInput {
  readonly review: Review | null;
  readonly players: Readonly<Record<Color, Player | undefined>>;
  /** Who won the game, for the trophy; null for a draw. */
  readonly winner: Color | null;
  readonly language: ReviewLanguage;
  /** The sides from left to right (`sideOrder`). */
  readonly order: readonly Color[];
  /** Lichess's speed of the game (`data.game.speed`), for the rating as on Chess.com. */
  readonly speed?: string | undefined;
}

/** White then Black, unless the signed-in user played Black: their own side comes first. */
export function sideOrder(
  players: Readonly<Record<Color, Player | undefined>>,
  me: string | undefined,
): readonly Color[] {
  const own = me?.toLowerCase();
  const isMe = (color: Color): boolean =>
    own !== undefined && players[color]?.user?.username?.toLowerCase() === own;
  return isMe('black') && !isMe('white') ? ['black', 'white'] : COLORS;
}

const letter = (color: Color): 'w' | 'b' => (color === 'white' ? 'w' : 'b');

/** The side with the higher accuracy, once both have one. */
function ahead(review: Review | null): Color | null {
  const white = review?.accuracy.white;
  const black = review?.accuracy.black;
  if (white === null || white === undefined || black === null || black === undefined) return null;
  if (white === black) return null;
  return white > black ? 'white' : 'black';
}

// As on Chess.com with the settings' Chess.com ratings on.
function shownRating(elo: number | undefined, speed: string | undefined): number | undefined {
  const equivalent =
    elo !== undefined && speed && chesscomShown() ? chesscomRating(speed, elo) : null;
  return equivalent?.rating ?? elo;
}

// A rating as on Chess.com gives the Lichess one in its tooltip (content/ui/tooltip.ts).
function ratingTip(
  elo: number | undefined,
  shown: number | undefined,
  ui: InterfaceStrings,
): SafeHtml | '' {
  return elo === undefined || shown === elo
    ? ''
    : html` data-ln-ext-lichess-rating="${elo}" data-ln-ext-tip="${ui.lichessRating(String(elo))}"`;
}

function playerCard(input: PlayersInput, color: Color): SafeHtml {
  const { review, players, winner, language } = input;
  const { ui } = language;
  const side = letter(color);
  const name = playerName(players[color], language);
  const accuracy = review?.accuracy[color];
  const elo = review?.rating?.[color]?.elo;
  const shown = shownRating(elo, input.speed);
  const [lead, tail] = ui.playedLike(color, shown ?? null);
  const best = ahead(review) === color;
  // The trophy sits at the card's right, beside the accuracy, clear of a long name.
  const trophy = winner === color ? html`<span class="ln-ext-sum-player__trophy"></span>` : '';
  return html`<div class="ln-ext-sum-player ln-ext-side-${side}${best ? ' ln-ext-sum-player--ahead' : ''}" data-ln-ext-side="${color}">
      <span class="ln-ext-avatar ln-ext-avatar--${side}"${avatarAttributes(players[color]?.user?.username)}></span>
      <span class="ln-ext-sum-player__name"><span>${name}</span></span>${trophy}
      <span class="ln-ext-sum-player__acc"><span class="ln-ext-acc ln-ext-acc--${side}">${accuracyText(review, accuracy)}</span><small>${ui.accuracy}</small></span>
      <span class="ln-ext-sum-player__elo">${lead} <span class="ln-ext-sum-player__rating"><b${ratingTip(elo, shown, ui)}>${shown ?? '—'}</b> ${tail}</span></span>
    </div>`;
}

// Blank while the analysis runs, a dash once it's done for a side without a move.
function accuracyText(
  review: Review | null | undefined,
  accuracy: number | null | undefined,
): SafeHtml | string {
  if (accuracy !== null && accuracy !== undefined) return accuracy.toFixed(1);
  return review?.complete ? '—' : NBSP;
}

export const playersMarkup = (input: PlayersInput): SafeHtml =>
  html`<div class="ln-ext-sum-players">${input.order.map(color => playerCard(input, color))}</div>`;

/** Pointing at a player dims the other side: `data-ln-ext-focus` on the panel. */
export function watchPlayerFocus(panel: HTMLElement): void {
  for (const card of queryAll(panel, '.ln-ext-sum-player', HTMLElement)) {
    card.addEventListener('pointerenter', () =>
      setData(panel, 'lnExtFocus', card.dataset.lnExtSide ?? null),
    );
    card.addEventListener('pointerleave', () => setData(panel, 'lnExtFocus', null));
  }
}
