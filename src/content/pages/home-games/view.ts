import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import type { RecentGame } from '#content/recent-games/games.ts';
import { gamePartsMarkup, SPEED_GLYPHS } from '#content/recent-games/parts.ts';

// The home's list of the user's last games (styles/home/games.css): a filter per
// speed they played, then a row per game, which opens it, with a button to
// analyse it.

/** The filter that keeps every game. */
export const EVERY_SPEED = 'all';

const SPEED_NAMES: Readonly<Record<string, string>> = {
  ultraBullet: 'speedUltraBullet',
  bullet: 'speedBullet',
  blitz: 'speedBlitz',
  rapid: 'speedRapid',
  classical: 'speedClassical',
  correspondence: 'speedCorrespondence',
};

/** The speeds among `games`, fastest first: none when there's only one to pick. */
export function playedSpeeds(games: readonly RecentGame[]): string[] {
  const played = new Set(games.map(game => game.speed));
  const speeds = Object.keys(SPEED_NAMES).filter(speed => played.has(speed));
  return speeds.length > 1 ? speeds : [];
}

function filterMarkup(speed: string): SafeHtml {
  const glyph = SPEED_GLYPHS[speed];
  const name = SPEED_NAMES[speed];
  return html`<button type="button" data-ln-ext-speed="${speed}">
    ${glyph && html`<span class="ln-ext-home-games__glyph" data-icon="${glyph}"></span>`}
    ${name ? message(name) : speed}
  </button>`;
}

function filtersMarkup(speeds: readonly string[]): SafeHtml {
  if (speeds.length === 0) return html``;
  return html`<div class="ln-ext-home-games__filters">
    <button type="button" class="active" data-ln-ext-speed="${EVERY_SPEED}">
      ${message('recentGamesEvery')}
    </button>
    ${speeds.map(filterMarkup)}
  </div>`;
}

function rowMarkup(game: RecentGame, now: number): SafeHtml {
  const analyse = message('recentGamesAnalyse');
  return html`<div class="ln-ext-home-games__row" data-ln-ext-speed="${game.speed}">
    <a class="ln-ext-recent__game" href="${game.href}"
      data-ln-ext-outcome="${game.outcome}">${gamePartsMarkup(game, now)}</a>
    <a class="ln-ext-home-games__analyse" href="${game.href}" title="${analyse}"
      aria-label="${analyse}"></a>
  </div>`;
}

/** The section's markup; `allHref` is the user's full list of games. */
export function homeGamesMarkup(
  games: readonly RecentGame[],
  allHref: string,
  now: number,
): SafeHtml {
  return html`<div class="ln-ext-recent__head">
      <span class="ln-ext-recent__tile" aria-hidden="true"></span>
      <h2>${message('recentGamesTitle')}</h2>
      <a class="ln-ext-recent__all" href="${allHref}">${message('recentGamesAll')}</a>
    </div>
    ${filtersMarkup(playedSpeeds(games))}
    <div class="ln-ext-home-games__list">${games.map(game => rowMarkup(game, now))}</div>`;
}
