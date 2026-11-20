import { afterEach, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import type * as EnginePool from '#page/review/engine-pool.ts';
import { fixtureGame, setUp } from '#page/review/fixtures/review-script.ts';
import { roundFinishedGame } from './game-data.ts';
import { onGameEnd } from './index.ts';

// The game's analysis boots its engine only once the board's wave is over:
// the boot would stop the wave for half a second.

const booted = vi.hoisted(() => ({ count: 0 }));

vi.mock('#page/review/engine-pool.ts', async importOriginal => {
  const pool = await importOriginal<typeof EnginePool>();
  return {
    ...pool,
    bootEngine: (chess960: boolean) => {
      booted.count++;
      return pool.bootEngine(chess960);
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
  booted.count = 0;
});

const GAME = fixtureGame('passant');

const ownData = (): string =>
  JSON.stringify({
    data: {
      game: { status: { name: 'resign' }, winner: 'white', variant: { key: 'standard' } },
      steps: GAME.nodes.map(node => ({ uci: null, san: null, ...node })),
    },
  });

it('boots the engine once the board’s wave has gone', async () => {
  const { advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  document.body.innerHTML =
    '<main class="round"><div class="result-wrap"></div><div class="rcontrols"><div class="follow-up"></div></div></main>' +
    '<div class="ln-ext-board-wave"></div>';
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) throw new Error('no game page');
  const ended = onGameEnd(
    { gameId: GAME.id, color: 'white', live: false },
    main,
    roundFinishedGame(ownData()),
  );
  await advance(2000);
  expect(booted.count).toBe(0);
  document.querySelector('.ln-ext-board-wave')?.remove();
  await advance(60_000);
  await ended;
  expect(booted.count).toBeGreaterThan(0);
  expect(localStorage.getItem(`ln-ext-review:${GAME.id}:${GAME.nodes.length}:v3`)).not.toBeNull();
});
