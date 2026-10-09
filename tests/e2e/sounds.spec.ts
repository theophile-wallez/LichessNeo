import { SOUND_NAMES } from '#shared/sounds.ts';
import { expect, test } from './fixtures.ts';
import { FINISHED_GAME, openLichess, readPageGlobal } from './support/lichess.ts';
import { importExamplePack, serveRepository } from './support/packs.ts';
import { activePly } from './support/move-list.ts';
import { heardSounds, OUR_SOUND_PREFIX, ourSounds, recordSounds } from './support/sounds.ts';

// A pack's sounds in Lichess's own sound player. Lichess's CSP lets audio
// load from blob: URLs only, so the content script reads the pack's sounds
// from its storage and the page script hands them over as blobs. Each test
// imports the example pack, which has all of them, on a page with a board.

test.beforeEach(async ({ page, context }) => {
  await serveRepository(context);
  await openLichess(page, '/analysis');
  await importExamplePack(page, 'sound');
});

test('a pack’s sounds are in Lichess’s sound player, as blobs of audio', async ({ page }) => {
  await openLichess(page, '/tv');
  await expect.poll(async () => (await ourSounds(page)).size).toBe(SOUND_NAMES.length);
  const sounds = await ourSounds(page);
  expect([...sounds.keys()].toSorted()).toEqual(
    SOUND_NAMES.map(name => `${OUR_SOUND_PREFIX}${name}`).toSorted(),
  );
  for (const url of sounds.values()) expect(url).toMatch(/^blob:https:\/\/lichess\.org\//);
  expect(await readPageGlobal(page, ['site', 'sound', 'lrExtHooked'])).toBe(true);

  // The bytes made it across: each blob is a whole WAV of the example pack.
  const heads = await page.evaluate(
    urls =>
      Promise.all(
        urls.map(async url => {
          const blob = await (await fetch(url)).blob();
          const head = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 12));
          return { size: blob.size, head };
        }),
      ),
    [...sounds.values()],
  );
  for (const { size, head } of heads) {
    expect(head).toMatch(/^RIFF.{4}WAVE$/s);
    expect(size).toBeGreaterThan(1000);
  }
});

test('stepping back through a game sounds like stepping forward', async ({ page }) => {
  await openLichess(page, FINISHED_GAME.path);
  await page.locator('.lr-ext-review__close').click();
  await expect.poll(async () => (await ourSounds(page)).size).toBe(SOUND_NAMES.length);
  await recordSounds(page);
  const step = async (key: string, ply: number): Promise<string[]> => {
    await page.keyboard.press(key);
    await expect.poll(() => activePly(page)).toBe(ply);
    // A jump's sound waits for the board to be redrawn, on the next frame.
    await page.evaluate(
      () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    return heardSounds(page);
  };

  // 1. e4 from Black's side, then 1... e5.
  await step('ArrowRight', 1);
  await step('ArrowRight', 2);
  expect(await step('ArrowLeft', 1)).toEqual([`${OUR_SOUND_PREFIX}move-opponent`]);
  expect(await step('ArrowLeft', 0)).toEqual([`${OUR_SOUND_PREFIX}move-self`]);
  // A step forward still gets its sound once.
  expect(await step('ArrowRight', 1)).toEqual([`${OUR_SOUND_PREFIX}move-opponent`]);
});

test('the board editor stays silent as pieces are moved around', async ({ page }) => {
  await openLichess(page, '/editor');
  await expect.poll(async () => (await ourSounds(page)).size).toBe(SOUND_NAMES.length);
  await recordSounds(page);
  const board = page.locator('main#board-editor cg-board');
  const box = await board.boundingBox();
  if (box === null) throw new Error('no board');
  const square = box.width / 8;
  // e2 to e5: anywhere goes in the editor, and nothing sounds.
  await page.mouse.move(box.x + square * 4.5, box.y + square * 6.5);
  await page.mouse.down();
  await page.mouse.move(box.x + square * 4.5, box.y + square * 3.5, { steps: 8 });
  await page.mouse.up();
  await expect(board.locator('piece.white.pawn')).toHaveCount(8);
  // A refused move sounds 80ms after the drop (SETTLE_MS, page/sounds/attempts.ts): a longer
  // timer set later in the page runs after it, so this waits on order, not on luck.
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 200)));
  expect(await heardSounds(page)).toEqual([]);
});
