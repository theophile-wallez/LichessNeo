import { PREVIEW_NAME, PREVIEW_URL } from '#shared/build-mode.ts';
import { createElement, onDomReady } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';

// Preview builds only (`pnpm preview --name`): a tag at the top of every page
// names the draft Chrome shows, as several sessions take turns at it, and
// leads to the page to review it on when the preview gives one (`--url`).

function buildTag(): HTMLElement {
  const tag =
    PREVIEW_URL === ''
      ? createElement('div', { className: 'ln-ext-preview-name' })
      : createElement('a', { className: 'ln-ext-preview-name', attrs: { href: PREVIEW_URL } });
  tag.append(
    createElement('span', { className: 'ln-ext-preview-name__label', text: 'Preview' }),
    createElement('span', { text: PREVIEW_NAME }),
  );
  return tag;
}

export const previewName: Feature = {
  name: 'preview name',
  start: () => {
    if (PREVIEW_NAME === '') return;
    onDomReady(() => document.body.append(buildTag()));
  },
};
