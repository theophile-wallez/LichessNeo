import { type FakeController } from './fake-lichess.ts';
import { click, hover, lichess, playOwn, type Scenario, type Step, wait } from './review-script.ts';

// Test support: the scripts the Game Review is driven through, for the
// original script's recordings and the port's tests alike.

const resize = (width: number): Step => ({
  name: `resize to ${width}`,
  run: async ({ advance }) => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    window.dispatchEvent(new Event('resize'));
    await advance(400);
  },
});

const flip = (ctrl: FakeController): void => {
  ctrl.orientation = ctrl.orientation === 'white' ? 'black' : 'white';
};

interface GamePlies {
  /** A move the engine would have played otherwise. */
  readonly correct: number;
  /** Where a move of its own is played off the game. */
  readonly offGame: number;
}

function gameSteps({ correct, offGame }: GamePlies): Step[] {
  return [
    wait('summary', 500),
    click('more rows', '[data-lr-ext="rows"]'),
    hover('rating tip', '.lr-ext-t-rating [data-lr-ext-tip]'),
    click('fewer rows', '[data-lr-ext="rows"]'),
    hover('summary graph', '.lr-ext-summary-graph', 150),
    click('start', '[data-lr-ext="moves"]', 1500),
    click('next', '#lr-ext-review [data-lr-ext="next"]', 1500),
    click('explain', '[data-lr-ext="explain"]', 1000),
    click('explain off', '[data-lr-ext="explain"]', 1000),
    lichess('a move to correct', ctrl => ctrl.jumpToMain(correct), 1500),
    click('explain the error', '[data-lr-ext="explain"]', 1000),
    click('best', '[data-lr-ext="best"]', 1000),
    click('next from the best', '#lr-ext-review [data-lr-ext="next"]', 1000),
    click('prev', '#lr-ext-review-controls [data-lr-ext="prev"]', 1000),
    click('best again', '[data-lr-ext="best"]', 1000),
    click('back to the move', '[data-lr-ext="best"]', 1000),
    click('explain back off', '[data-lr-ext="explain"]', 500),
    click('first', '[data-lr-ext="first"]', 800),
    click('last', '[data-lr-ext="last"]', 800),
    click('moves graph', '#lr-ext-review-graph', 800, 120),
    hover('moves graph hover', '#lr-ext-review-graph', 60),
    click('play', '#lr-ext-review-controls [data-lr-ext="play"]', 1300),
    wait('playing', 1200),
    click('pause', '#lr-ext-review-controls [data-lr-ext="play"]', 400),
    click('coach', '.lr-ext-coach__avatar', 800),
    lichess('before the move off the game', ctrl => ctrl.jumpToMain(offGame), 800),
    playOwn('a move off the game'),
    playOwn('another move off it'),
    click('prev off the game', '#lr-ext-review-controls [data-lr-ext="prev"]', 1000),
    lichess('flip', flip),
    resize(1300),
    click('close', '[data-lr-ext="normal"]', 600),
    click('reopen', '[data-lr-ext="summary"]', 600),
    lichess('move on from the summary', ctrl => ctrl.jumpToMain(3), 800),
  ];
}

export const GAME_EN: Scenario = {
  game: 'opera',
  lang: 'en',
  cached: true,
  steps: gameSteps({ correct: 14, offGame: 20 }),
};

export const GAME_FR: Scenario = {
  game: 'evergreen',
  lang: 'fr',
  cached: true,
  steps: gameSteps({ correct: 17, offGame: 12 }),
};

export const FRESH: Scenario = {
  game: 'passant',
  lang: 'en',
  cached: false,
  serverAnalysis: true,
  steps: [
    wait('booting', 50),
    wait('quick pass', 300),
    wait('under way', 600),
    click('start early', '[data-lr-ext="moves"]', 300),
    wait('deep', 600),
    click('next', '#lr-ext-review [data-lr-ext="next"]', 400),
    click('back to the summary', '[data-lr-ext="summary"]', 1200),
    wait('done', 6000),
    click('start', '[data-lr-ext="moves"]', 1000),
  ],
};

const play = (uci: string, pause = 3000): Step =>
  lichess(`play ${uci}`, ctrl => ctrl.playUci(uci), pause);

export const LIVE: Scenario = {
  game: 'opera',
  lang: 'fr',
  cached: false,
  synthetic: true,
  steps: [
    wait('empty board', 500),
    play('e2e4'),
    play('e7e5'),
    play('g1f3'),
    play('b8c6'),
    play('f1b5'),
    lichess('back', ctrl => ctrl.userJump(ctrl.path.slice(0, -4)), 1000),
    play('b1c3'),
    lichess('to the start', ctrl => ctrl.userJump(''), 1000),
    click('coach', '.lr-ext-coach__avatar', 500),
    lichess('flip', flip),
  ],
};

export const LIVE_SIGNED_OUT: Scenario = {
  game: 'immortal',
  lang: 'en',
  cached: false,
  synthetic: true,
  signedOut: true,
  steps: [wait('empty board', 500), play('d2d4'), play('d7d5'), play('c1f4', 1000), play('g8f6')],
};
