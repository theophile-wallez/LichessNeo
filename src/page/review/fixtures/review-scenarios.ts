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
    click('more rows', '[data-ln-ext="rows"]'),
    hover('rating tip', '.ln-ext-t-rating [data-ln-ext-tip]'),
    click('fewer rows', '[data-ln-ext="rows"]'),
    hover('summary graph', '.ln-ext-summary-graph', 150),
    click('start', '[data-ln-ext="moves"]', 1500),
    click('next', '#ln-ext-review [data-ln-ext="next"]', 1500),
    click('explain', '[data-ln-ext="explain"]', 1000),
    click('explain off', '[data-ln-ext="explain"]', 1000),
    lichess('a move to correct', ctrl => ctrl.jumpToMain(correct), 1500),
    click('explain the error', '[data-ln-ext="explain"]', 1000),
    click('best', '[data-ln-ext="best"]', 1000),
    click('next from the best', '#ln-ext-review [data-ln-ext="next"]', 1000),
    click('prev', '#ln-ext-review-controls [data-ln-ext="prev"]', 1000),
    click('best again', '[data-ln-ext="best"]', 1000),
    click('back to the move', '[data-ln-ext="best"]', 1000),
    click('explain back off', '[data-ln-ext="explain"]', 500),
    click('first', '[data-ln-ext="first"]', 800),
    click('last', '[data-ln-ext="last"]', 800),
    click('moves graph', '#ln-ext-review-graph', 800, 120),
    hover('moves graph hover', '#ln-ext-review-graph', 60),
    click('play', '#ln-ext-review-controls [data-ln-ext="play"]', 1300),
    wait('playing', 1200),
    click('pause', '#ln-ext-review-controls [data-ln-ext="play"]', 400),
    click('coach', '.ln-ext-coach__avatar', 800),
    lichess('before the move off the game', ctrl => ctrl.jumpToMain(offGame), 800),
    playOwn('a move off the game'),
    playOwn('another move off it'),
    click('prev off the game', '#ln-ext-review-controls [data-ln-ext="prev"]', 1000),
    lichess('flip', flip),
    resize(1300),
    click('close', '[data-ln-ext="normal"]', 600),
    click('reopen', '[data-ln-ext="summary"]', 600),
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
    click('start early', '[data-ln-ext="moves"]', 300),
    wait('deep', 600),
    click('next', '#ln-ext-review [data-ln-ext="next"]', 400),
    click('back to the summary', '[data-ln-ext="summary"]', 1200),
    wait('done', 6000),
    click('start', '[data-ln-ext="moves"]', 1000),
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
    click('coach', '.ln-ext-coach__avatar', 500),
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
