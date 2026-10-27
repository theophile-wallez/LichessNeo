import { wrapOrientation } from '#shared/chessground.ts';
import { opposite, type Color } from '#shared/chess/types.ts';
import { createElement, isParsing, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { gameIdFrom } from '#shared/game-path.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { message } from '#content/platform/runtime.ts';
import { currentSettings } from '#content/settings/settings.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { withExactRatings } from './exact.ts';
import { ratedGame, type RatedGame } from './round.ts';
import { gameStakes, type Stakes } from './rules.ts';

// What a player wins, draws or loses in a rated game in play, in one pill on
// the captured pieces' line of their bar (styles/game/stakes.css): the
// player's own, or both players' for a watcher. Once the game is over Lichess
// shows the real change by the rating, and ours goes. The settings' Play page
// turns it off.

const OUTCOMES = ['win', 'draw', 'loss'] as const;

export type StakesTexts = Readonly<Record<keyof Stakes, string>>;

function signed(points: number): string {
  if (points === 0) return '±0';
  return points > 0 ? `+${points}` : `−${-points}`;
}

/** A bar's pill: what its player wins, draws and loses. */
export function stakesMarkup(stakes: Stakes, texts: StakesTexts): SafeHtml {
  return html`${OUTCOMES.map(outcome => {
    const points = signed(stakes[outcome]);
    return html`<span
      class="ln-ext-stakes__outcome ln-ext-stakes__outcome--${outcome}"
      data-ln-ext-tip="${texts[outcome]}"
      aria-label="${texts[outcome]} ${points}"
      >${points}</span
    >`;
  })}`;
}

const buildPill = (side: string) => (): HTMLElement =>
  createElement('div', { className: `ln-ext-stakes ln-ext-stakes--${side}` });

/** A sync task drawing the stakes in the game page's bars until the game is over. */
export function createStakesSync(game: RatedGame, texts: StakesTexts): () => void {
  const stakes = gameStakes(game);
  const shown = (color: Color): boolean => game.own === null || game.own === color;
  const ownTop = createOwnedElement(buildPill('top'));
  const ownBottom = createOwnedElement(buildPill('bottom'));
  let drawnBottom: Color | null = null;
  return () => {
    const main = queryOne(document, 'main.round', HTMLElement);
    const wrap = main && queryOne(main, '.round__app__board .cg-wrap', Element);
    // TV swaps games without a reload: only the game's own page is trusted.
    if (!main || !wrap || gameIdFrom(location.pathname) !== game.id) return;
    const top = ownTop(main);
    const bottom = ownBottom(main);
    const bottomColor = wrapOrientation(wrap);
    const off = !currentSettings().ratingStakes || main.querySelector('.result-wrap') !== null;
    top.element.toggleAttribute('hidden', off || !shown(opposite(bottomColor)));
    bottom.element.toggleAttribute('hidden', off || !shown(bottomColor));
    if (bottomColor === drawnBottom && !top.isNew && !bottom.isNew) return;
    drawnBottom = bottomColor;
    setHtml(top.element, stakesMarkup(stakes[opposite(bottomColor)], texts));
    setHtml(bottom.element, stakesMarkup(stakes[bottomColor], texts));
  };
}

async function showStakes(game: RatedGame): Promise<void> {
  const texts: StakesTexts = {
    win: message('stakesWin'),
    draw: message('stakesDraw'),
    loss: message('stakesLoss'),
  };
  onEveryTick('rating stakes', createStakesSync(await withExactRatings(game), texts));
}

export const ratingStakes: Feature = {
  name: 'rating stakes',
  start: () => {
    // Lichess removes its init data once read: only a script running while
    // the page parses sees it.
    if (!isParsing()) return;
    readPageInitData(initData => {
      const game = ratedGame(initData);
      if (game) void showStakes(game);
    });
  },
};
