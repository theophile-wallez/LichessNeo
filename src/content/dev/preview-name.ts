import { PREVIEW_NAME } from '#shared/build-mode.ts';
import { createElement, onDomReady } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';

// Preview builds only (`pnpm preview --name`): a tag at the top of every page
// names the draft Chrome shows, as several sessions take turns at it.

export const previewName: Feature = {
  name: 'preview name',
  start: () => {
    if (PREVIEW_NAME === '') return;
    onDomReady(() => {
      const tag = createElement('div', { className: 'ln-ext-preview-name' });
      tag.append(
        createElement('span', { className: 'ln-ext-preview-name__label', text: 'Preview' }),
        createElement('span', { text: PREVIEW_NAME }),
      );
      document.body.append(tag);
    });
  },
};
