import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PreviewLink } from '#shared/build-mode.ts';
import type { Feature } from '#shared/features.ts';

/** The feature as a build with these constants would have it: build-mode.ts reads them once. */
async function previewNameFor(
  devBuild: boolean,
  name: string,
  links: readonly PreviewLink[] = [],
): Promise<Feature> {
  vi.stubGlobal('LN_EXT_DEV_BUILD', devBuild);
  vi.stubGlobal('LN_EXT_PREVIEW', name);
  vi.stubGlobal('LN_EXT_PREVIEW_LINKS', links);
  vi.resetModules();
  const { previewName } = await import('./preview-name.ts');
  return previewName;
}

const analysis = { label: '/analysis', href: 'https://lichess.org/analysis' };
const puzzle = { label: 'Puzzle', href: 'https://lichess.org/training/abc' };

const shownName = (): string | null =>
  document.querySelector('.ln-ext-preview-name__name')?.textContent ?? null;

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
    (await previewNameFor(true, 'Eval bar', [analysis])).start();
    expect(document.querySelector('a.ln-ext-preview-name')?.getAttribute('href')).toBe(
      analysis.href,
    );
    expect(document.querySelector('.ln-ext-preview-name__links')).toBeNull();
  });

  it('lists the pages to review the draft on, when the preview gives several', async () => {
    (await previewNameFor(true, 'Eval bar', [analysis, puzzle])).start();
    expect(document.querySelector('.ln-ext-preview-name')?.tagName).toBe('DIV');
    const links = [...document.querySelectorAll('.ln-ext-preview-name__links a')];
    expect(links.map(link => [link.textContent, link.getAttribute('href')])).toEqual([
      ['/analysis', analysis.href],
      ['Puzzle', puzzle.href],
    ]);
    expect(shownName()).toBe('Eval bar');
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
    (await previewNameFor(false, 'Eval bar', [analysis, puzzle])).start();
    expect(document.querySelector('.ln-ext-preview-name')).toBeNull();
  });
});
