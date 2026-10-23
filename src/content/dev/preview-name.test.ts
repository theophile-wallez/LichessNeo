import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Feature } from '#shared/features.ts';

/** The feature as a build with these constants would have it: build-mode.ts reads them once. */
async function previewNameFor(devBuild: boolean, name: string): Promise<Feature> {
  vi.stubGlobal('LN_EXT_DEV_BUILD', devBuild);
  vi.stubGlobal('LN_EXT_PREVIEW', name);
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

  it('shows nothing in a dev build that is no preview', async () => {
    (await previewNameFor(true, '')).start();
    expect(document.querySelector('.ln-ext-preview-name')).toBeNull();
  });

  it('shows nothing in a release build, whatever it was given', async () => {
    (await previewNameFor(false, 'Eval bar')).start();
    expect(document.querySelector('.ln-ext-preview-name')).toBeNull();
  });
});
