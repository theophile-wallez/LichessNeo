import { beforeAll, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { showPanelPart } from '#content/layout/panel-tabs.ts';
import { startSyncLoop } from '#content/sync-loop.ts';
import { studyMarkup } from './fixtures.ts';
import { studyHead } from './head.ts';

vi.mock(import('#content/layout/panel-tabs.ts'), async importOriginal => ({
  ...(await importOriginal()),
  showPanelPart: vi.fn<(part: string) => void>(),
}));

const TICK_MS = 250;

beforeAll(() => {
  vi.useFakeTimers();
  studyHead.start();
  startSyncLoop();
});

const head = (part: string): HTMLElement | null =>
  queryOne(document, `.ln-ext-study-head__${part}`, HTMLElement);

function show(markup: string): void {
  document.body.innerHTML = markup;
  vi.advanceTimersByTime(TICK_MS);
}

describe('a study’s head', () => {
  it('names the study without its chapter, with its flair, chapters and members', () => {
    show(studyMarkup({ active: 1 }));
    expect(head('name')?.textContent).toBe('Caro-Kann');
    expect(head('flair')?.getAttribute('src')).toBe('https://lichess1.org/flair/a.webp');
    expect(head('meta')?.textContent).toBe('3 Chapters · 2 Members');
  });

  it('shows the likes and passes a like on to Lichess', () => {
    show(studyMarkup());
    const like = head('like');
    expect(head('likes')?.textContent).toBe('42');
    expect(like?.dataset.lnExtLiked).toBe('');
    expect(like?.getAttribute('aria-label')).toBe('Like');
    const liked = vi.fn<() => void>();
    queryOne(document, '.liking', HTMLElement)?.addEventListener('click', liked);
    like?.click();
    expect(liked).toHaveBeenCalledOnce();
  });

  it('shares in the panel’s Infos, through Lichess’s own button', () => {
    show(studyMarkup());
    const shared = vi.fn<() => void>();
    queryOne(document, '.study__buttons .share', HTMLElement)?.addEventListener('click', shared);
    head('share')?.click();
    expect(showPanelPart).toHaveBeenCalledWith('meta');
    expect(shared).toHaveBeenCalledOnce();
  });

  it('has no share button where Lichess draws none, as on a gamebook', () => {
    show(studyMarkup({ buttons: false }));
    expect(head('share')?.hidden).toBe(true);
  });
});
