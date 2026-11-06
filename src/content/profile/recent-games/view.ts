import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import type { RecentGame } from '#content/recent-games/games.ts';
import { gamePartsMarkup } from '#content/recent-games/parts.ts';

// The section's markup (styles/profile/recent-games.css): a card per game.

function gameMarkup(game: RecentGame, now: number): SafeHtml {
  return html`<a class="ln-ext-recent__game" href="${game.href}"
      data-ln-ext-outcome="${game.outcome}">${gamePartsMarkup(game, now)}</a>`;
}

/** The section's markup; `allHref` is the profile's full list of games. */
export function recentGamesMarkup(
  games: readonly RecentGame[],
  allHref: string,
  now: number,
): SafeHtml {
  return html`<div class="ln-ext-recent__head">
      <span class="ln-ext-recent__tile" aria-hidden="true"></span>
      <h2>${message('recentGamesTitle')}</h2>
      <a class="ln-ext-recent__all" href="${allHref}">${message('recentGamesAll')}</a>
    </div>
    <div class="ln-ext-recent__row">${games.map(game => gameMarkup(game, now))}</div>`;
}
