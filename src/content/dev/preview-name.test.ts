import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Feature } from '#shared/features.ts';

/** The feature as a build with these constants would have it: build-mode.ts reads them once. */
async function previewNameFor(devBuild: boolean, name: string, url = ''): Promise<Feature> {
  vi.stubGlobal('LN_EXT_DEV_BUILD', devBuild);
  vi.stubGlobal('LN_EXT_PREVIEW', name);
  vi.stubGlobal('LN_EXT_PREVIEW_URL', url);
  vi.resetModules();
  const { previewName } = await import('./preview-name.ts');
  return previewName;
}

const shownName = (): string | null =>
  document.querySelector('.ln-ext-preview-name > span:last-child')?.textContent ?? null;

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('previewName', () => {
  it('names the draft a preview build shows', async () => {
    (await previewNameFor(true, "Barre d'éval <retournée>")).start();
    expect(shownName()).toBe("Barre d'éval <retournée>");
  });

  it('links to the page to review the draft on, when the preview gives one', async () => {
    (await previewNameFor(true, 'Eval bar', 'https://lichess.org/analysis')).start();
    expect(document.querySelector('a.ln-ext-preview-name')?.getAttribute('href')).toBe(
      'https://lichess.org/analysis',
    );
  });

  it('links nowhere without a page to review', async () => {
    (await previewNameFor(true, 'Eval bar')).start();
    expect(document.querySelector('.ln-ext-preview-name')?.tagName).toBe('DIV');
  });

  it('shows nothing in a dev build that is no preview', async () => {
    (await previewNameFor(true, '')).start();
    expect(document.querySelector('.ln-ext-preview-name')).toBeNull();
  });

  it('shows nothing in a release build, whatever it was given', async () => {
    (await previewNameFor(false, 'Eval bar', 'https://lichess.org/analysis')).start();
    expect(document.querySelector('.ln-ext-preview-name')).toBeNull();
  });
});
