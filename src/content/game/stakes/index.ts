import { wrapOrientation } from '#shared/chessground.ts';
import { opposite, type Color } from '#shared/chess/types.ts';
import { createElement, isParsing, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { GAME_PAGE } from '#shared/game-path.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { message } from '#content/platform/runtime.ts';
import { currentSettings } from '#content/settings/settings.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { currentGameId } from '#content/game/current-game.ts';
import { withExactRatings } from './exact.ts';
import { ratedGame, type RatedGame } from './round.ts';
import { gameStakes, type Stakes } from './rules.ts';
import { TV_PAGE, tvGame } from './tv.ts';

// What a player wins, draws or loses in a rated game in play, in one pill on
// the captured pieces' line of their bar (styles/game/stakes.css): the
// player's own, or both players' for a watcher, on the game's page or on TV.
// Once the game is over Lichess shows the real change by the rating, and ours
// goes. The settings' Play page turns it off.

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

function hideAll(main: HTMLElement): void {
  for (const pill of main.querySelectorAll('.ln-ext-stakes')) pill.toggleAttribute('hidden', true);
}

/**
 * A sync task drawing the stakes of the game on show in the game page's bars,
 * until it's over. `gameOf` gives a game's stakes once they're known.
 */
export function createStakesSync(
  gameOf: (id: string) => RatedGame | null,
  texts: StakesTexts,
): () => void {
  const ownTop = createOwnedElement(buildPill('top'));
  const ownBottom = createOwnedElement(buildPill('bottom'));
  let drawn = '';
  return () => {
    const main = queryOne(document, 'main.round', HTMLElement);
    const wrap = main && queryOne(main, '.round__app__board .cg-wrap', Element);
    if (!main || !wrap) return;
    const id = currentGameId();
    const game = id === null ? null : gameOf(id);
    if (!game) {
      hideAll(main);
      return;
    }
    const top = ownTop(main);
    const bottom = ownBottom(main);
    const bottomColor = wrapOrientation(wrap);
    const shown = (color: Color): boolean => game.own === null || game.own === color;
    const off = !currentSettings().ratingStakes || main.querySelector('.result-wrap') !== null;
    top.element.toggleAttribute('hidden', off || !shown(opposite(bottomColor)));
    bottom.element.toggleAttribute('hidden', off || !shown(bottomColor));
    const key = `${game.id}|${bottomColor}`;
    if (key === drawn && !top.isNew && !bottom.isNew) return;
    drawn = key;
    const stakes = gameStakes(game);
    setHtml(top.element, stakesMarkup(stakes[opposite(bottomColor)], texts));
    setHtml(bottom.element, stakesMarkup(stakes[bottomColor], texts));
  };
}

/** Each game's stakes as they're known: a game page's from its init data, TV's as it swaps them. */
function createGames(onTv: boolean): {
  readonly gameOf: (id: string) => RatedGame | null;
  readonly add: (game: RatedGame) => void;
} {
  const games = new Map<string, RatedGame | null>();
  return {
    gameOf: id => {
      if (onTv && !games.has(id)) {
        games.set(id, null);
        void tvGame(id).then(game => games.set(id, game));
      }
      return games.get(id) ?? null;
    },
    add: game => games.set(game.id, game),
  };
}

export const ratingStakes: Feature = {
  name: 'rating stakes',
  start: () => {
    const onTv = TV_PAGE.test(location.pathname);
    if (!onTv && !GAME_PAGE.test(location.pathname)) return;
    const games = createGames(onTv);
    // Lichess removes its init data once read: only a script running while
    // the page parses sees it.
    if (!onTv && isParsing())
      readPageInitData(initData => {
        const game = ratedGame(initData);
        if (game) void withExactRatings(game).then(games.add);
      });
    const texts: StakesTexts = {
      win: message('stakesWin'),
      draw: message('stakesDraw'),
      loss: message('stakesLoss'),
    };
    onEveryTick('rating stakes', createStakesSync(games.gameOf, texts));
  },
};
