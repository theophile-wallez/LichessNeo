import { avatarAttributes } from '#shared/own-avatar.ts';
import { shownName } from '#shared/own-name.ts';
import { COLORS, type Color } from '#shared/chess/types.ts';
import { queryAll, setData } from '#shared/dom.ts';
import { html, type SafeHtml, trustedHtml } from '#shared/html.ts';
import type { Player } from '#page/lichess/analysis.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { Review } from '#page/review/session.ts';

// The summary's two players side by side, each in its side's color: the
// accuracy, large, and the rating the game was played at. Pointing at one
// dims the other side's colors through the whole summary.

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

function playerCard({ review, players, winner, language }: PlayersInput, color: Color): SafeHtml {
  const { ui } = language;
  const side = letter(color);
  const name = playerName(players[color], language);
  const accuracy = review?.accuracy[color];
  const elo = review?.rating?.[color]?.elo;
  const [lead, tail] = ui.playedLike(color, elo ?? null);
  const best = ahead(review) === color;
  // The trophy sits at the card's right, beside the accuracy, clear of a long name.
  const trophy = winner === color ? html`<span class="lr-ext-sum-player__trophy"></span>` : '';
  return html`<div class="lr-ext-sum-player lr-ext-side-${side}${best ? ' lr-ext-sum-player--ahead' : ''}" data-lr-ext-side="${color}">
      <span class="lr-ext-avatar lr-ext-avatar--${side}"${avatarAttributes(players[color]?.user?.username)}></span>
      <span class="lr-ext-sum-player__name"><span>${name}</span></span>${trophy}
      <span class="lr-ext-sum-player__acc"><span class="lr-ext-acc lr-ext-acc--${side}">${accuracy === null || accuracy === undefined ? NBSP : accuracy.toFixed(1)}</span><small>${ui.accuracy}</small></span>
      <span class="lr-ext-sum-player__elo">${lead} <span class="lr-ext-sum-player__rating"><b>${elo ?? '—'}</b> ${tail}</span></span>
    </div>`;
}

export const playersMarkup = (input: PlayersInput): SafeHtml =>
  html`<div class="lr-ext-sum-players">${input.order.map(color => playerCard(input, color))}</div>`;

/** Pointing at a player dims the other side: `data-lr-ext-focus` on the panel. */
export function watchPlayerFocus(panel: HTMLElement): void {
  for (const card of queryAll(panel, '.lr-ext-sum-player', HTMLElement)) {
    card.addEventListener('pointerenter', () =>
      setData(panel, 'lrExtFocus', card.dataset.lrExtSide ?? null),
    );
    card.addEventListener('pointerleave', () => setData(panel, 'lrExtFocus', null));
  }
}
