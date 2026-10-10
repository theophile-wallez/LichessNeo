import { afterEach, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import {
  fixtureGame,
  SCRIPT_DELAY,
  setUp,
  useFakeEngine,
} from '#page/review/fixtures/review-script.ts';
import { onGameEnd } from './index.ts';
import { gameOverTexts } from './texts.ts';

// The game over on a machine too busy for the quick look: its engine says
// nothing, so the card waits for Game Review's own analysis.

afterEach(() => {
  vi.useRealTimers();
});

const GAME = fixtureGame('passant');

const finishedPage = (): string =>
  `<script id="page-init-data" type="application/json">${JSON.stringify({
    cfg: {
      data: {
        game: { status: { name: 'resign' }, winner: 'white', variant: { key: 'standard' } },
        treeParts: GAME.nodes,
      },
    },
  })}</script>`;

it('gives the review’s figures when the quick look’s engine never answers', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  // The quick look searches to depth 10, the review to 16.
  useFakeEngine(ctrl, search => (search.depth < 16 ? null : SCRIPT_DELAY(search)));
  const network = globalThis.fetch;
  vi.stubGlobal('fetch', async (url: string) =>
    url === `/${GAME.id}` ? new Response(finishedPage()) : network(url),
  );
  const warned = vi.spyOn(console, 'warn').mockImplementation(() => {});
  document.body.innerHTML = '<main class="round"><div class="result-wrap"></div></main>';
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) throw new Error('no game page');
  const ended = onGameEnd({ gameId: GAME.id, color: 'white', live: true }, main);
  await advance(60_000);
  await ended;
  expect(warned).toHaveBeenCalledWith('[LichessReimagined] game over analysis', expect.any(Error));
  const bubble = queryOne(document, '.lr-ext-end__bubble', HTMLElement);
  expect(bubble?.textContent).toMatch(/You played with [\d.]+% accuracy/);
  expect(bubble?.textContent).not.toBe(gameOverTexts().failed);
  expect(localStorage.getItem(`lr-ext-review:${GAME.id}:${GAME.nodes.length}:v1`)).not.toBeNull();
});
