import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { buildChesscomCards } from './chesscom-card.ts';

const synced = new Map<string, unknown>();

beforeEach(() => {
  synced.clear();
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (name: string) => name },
    runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test/${path}` },
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
});

describe('the settings’ Chess.com ratings', () => {
  it('switches the Chess.com ratings on', async () => {
    const page = buildChesscomCards();
    await flush();
    queryOne(page, "[data-ln-ext-setting='chesscomRating'] .ln-ext-switch", HTMLElement)?.click();
    await flush();
    expect(synced.get('ln-ext-settings')).toMatchObject({ chesscomRating: true });
  });

  it('frames the study, through our page, only once unfolded', () => {
    const page = buildChesscomCards();
    const study = queryOne(page, '.ln-ext-study', HTMLDetailsElement);
    const frame = queryOne(page, '.ln-ext-study__frame', HTMLIFrameElement);
    expect(frame?.hasAttribute('src')).toBe(false);
    expect(frame?.hasAttribute('credentialless')).toBe(true);
    if (study) study.open = true;
    study?.dispatchEvent(new Event('toggle'));
    expect(frame?.getAttribute('src')).toBe('chrome-extension://test/pages/rating-study.html');
    expect(queryOne(page, '.ln-ext-study__link', HTMLAnchorElement)?.href).toBe(
      'https://theophile-wallez.github.io/lichess-chesscom-ratings/',
    );
  });
});
