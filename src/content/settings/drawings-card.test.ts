import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAWING_TOPICS } from '#shared/coach-drawings.ts';
import { closestTo, queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';

// chrome.storage.sync, as the settings read and write it.
const synced = new Map<string, unknown>();

beforeEach(() => {
  synced.clear();
  vi.stubGlobal('chrome', {
    i18n: {
      getMessage: (name: string, substitutions: readonly string[] = []) =>
        [name, ...substitutions].join(':'),
    },
    runtime: { id: 'test' },
    storage: {
      sync: {
        get: (key: string) => Promise.resolve({ [key]: synced.get(key) }),
        set: (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) synced.set(key, value);
          return Promise.resolve();
        },
      },
      onChanged: { addListener: () => {} },
    },
  });
  // The settings are read once per content script: each test reads its own.
  vi.resetModules();
});

async function buildCard(stored?: Record<string, unknown>): Promise<HTMLElement> {
  if (stored) synced.set('ln-ext-settings', stored);
  const { buildDrawingsCard: build } = await import('./drawings-card.ts');
  const list = build();
  document.body.replaceChildren(list);
  await flush();
  const card = queryOne(list, '.ln-ext-drawings', HTMLElement);
  if (!card) throw new Error('no card');
  return card;
}

const tile = (card: HTMLElement, topic: string): HTMLButtonElement | null =>
  queryOne(card, `[data-ln-ext-topic='${topic}']`, HTMLButtonElement);

const preset = (card: HTMLElement, kind: 'all' | 'none'): HTMLButtonElement | null =>
  queryOne(card, `[data-ln-ext-preset='${kind}']`, HTMLButtonElement);

const pressed = (card: HTMLElement): string[] =>
  queryAll(card, "[data-ln-ext-topic][aria-pressed='true']", HTMLElement).map(
    element => element.dataset.lnExtTopic ?? '',
  );

const count = (card: HTMLElement): HTMLElement | null =>
  queryOne(card, '.ln-ext-drawings__count', HTMLElement);

const stored = (): unknown => synced.get('ln-ext-settings');

describe('the coach’s drawings’ card', () => {
  it('draws every kind until told otherwise', async () => {
    const card = await buildCard();
    expect(pressed(card)).toEqual([...DRAWING_TOPICS]);
    expect(preset(card, 'all')?.getAttribute('aria-pressed')).toBe('true');
    expect(preset(card, 'none')?.getAttribute('aria-pressed')).toBe('false');
    expect(count(card)?.hidden).toBe(true);
  });

  it('leaves a kind out, says how many are left, and lights neither All nor None', async () => {
    const card = await buildCard();
    tile(card, 'pins')?.click();
    await flush();
    expect(pressed(card)).not.toContain('pins');
    expect(stored()).toMatchObject({ coachBoard: true, coachDrawingsHidden: ['pins'] });
    expect(preset(card, 'all')?.getAttribute('aria-pressed')).toBe('false');
    expect(preset(card, 'none')?.getAttribute('aria-pressed')).toBe('false');
    expect(count(card)?.hidden).toBe(false);
    expect(count(card)?.textContent).toBe('drawingsCount:9:10');
  });

  it('turns them all off with None, and back on with All', async () => {
    const card = await buildCard({ coachDrawingsHidden: ['pins'] });
    preset(card, 'none')?.click();
    await flush();
    expect(stored()).toMatchObject({ coachBoard: false, coachDrawingsHidden: [] });
    expect(pressed(card)).toEqual([]);
    expect(card.dataset.lnExtOn).toBeUndefined();
    preset(card, 'all')?.click();
    await flush();
    expect(stored()).toMatchObject({ coachBoard: true, coachDrawingsHidden: [] });
    expect(pressed(card)).toEqual([...DRAWING_TOPICS]);
  });

  it('draws the one kind picked after None, and is None again once the last is left out', async () => {
    const card = await buildCard({ coachBoard: false });
    expect(preset(card, 'none')?.getAttribute('aria-pressed')).toBe('true');
    tile(card, 'mates')?.click();
    await flush();
    expect(pressed(card)).toEqual(['mates']);
    expect(stored()).toMatchObject({
      coachBoard: true,
      coachDrawingsHidden: DRAWING_TOPICS.filter(topic => topic !== 'mates'),
    });
    tile(card, 'mates')?.click();
    await flush();
    expect(stored()).toMatchObject({ coachBoard: false, coachDrawingsHidden: [] });
    expect(preset(card, 'none')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows a hovered kind’s drawing on a little board, and hides it as the pointer leaves', async () => {
    const card = await buildCard();
    const preview = queryOne(card, '.ln-ext-drawings__preview', HTMLElement);
    const grid = queryOne(card, '.ln-ext-drawings__grid', HTMLElement);
    const name = tile(card, 'forks')?.querySelector('.ln-ext-drawing-kind__name');
    name?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    expect(preview?.hidden).toBe(false);
    expect(preview?.textContent).toContain('drawingForks');
    const board = queryOne(card, '.ln-ext-drawings__preview-board', HTMLElement);
    expect(queryAll(board ?? card, 'piece', HTMLElement)).toHaveLength(4);
    // The knight's fork: its lines to the king and the rook, under the pieces.
    const links = queryAll(board ?? card, '.ln-ext-drawing__link', SVGElement);
    expect(links).toHaveLength(2);
    const drawing = closestTo(links[0] ?? null, '.ln-ext-drawings__marks', SVGElement);
    const layers = [...(closestTo(drawing, 'cg-board', HTMLElement)?.children ?? [])];
    expect(layers.indexOf(drawing ?? card)).toBeLessThan(
      layers.findIndex(layer => layer.tagName === 'PIECE'),
    );
    grid?.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(preview?.hidden).toBe(true);
  });

  it('shows no preview for a touch, which picks the kind alone', async () => {
    const card = await buildCard();
    const preview = queryOne(card, '.ln-ext-drawings__preview', HTMLElement);
    tile(card, 'forks')?.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }),
    );
    expect(preview?.hidden).toBe(true);
  });
});
