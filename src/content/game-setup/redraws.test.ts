import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const SETUP =
  '<dialog open><div class="game-setup"><div class="setup-content"></div></div></dialog>';

let synced = { count: 0 };

beforeEach(async () => {
  // A module and a count of their own for each test: the module keeps its syncs and
  // the dialog it watches, and the earlier ones still listen.
  const count = { count: 0 };
  synced = count;
  vi.resetModules();
  const { followSetup } = await import('./redraws.ts');
  followSetup('test', () => count.count++);
});

afterEach(() => {
  document.body.replaceChildren();
});

const frame = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => resolve()));

describe('following the game setup', () => {
  it('syncs on the frames after a click, until a setup opens', async () => {
    document.body.click();
    await frame();
    expect(synced.count).toBe(1);
    await frame();
    expect(synced.count).toBe(2);
    document.body.innerHTML = SETUP;
    await frame();
    const opened = synced.count;
    await frame();
    await frame();
    expect(synced.count).toBe(opened);
  });

  it('syncs as Lichess redraws the open setup', async () => {
    document.body.innerHTML = SETUP;
    document.body.click();
    await frame();
    const opened = synced.count;
    queryOne(document, '.setup-content', HTMLElement)?.append(document.createElement('div'));
    await vi.waitFor(() => expect(synced.count).toBeGreaterThan(opened));
  });

  it('doesn’t sync on the page’s other changes', async () => {
    document.body.innerHTML = `${SETUP}<div class="lobby"></div>`;
    document.body.click();
    await frame();
    const opened = synced.count;
    queryOne(document, '.lobby', HTMLElement)?.append(document.createElement('div'));
    await frame();
    expect(synced.count).toBe(opened);
  });
});
