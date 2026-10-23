import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import { PREVIEW_LINKS, PREVIEW_NAME, type PreviewLink } from '#shared/build-mode.ts';
import { createElement, onDomReady } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';

// Preview builds only (`pnpm preview --name`): a tag at the top of every page
// names the draft Chrome shows, as several sessions take turns at it, and
// leads to the pages to review it on when the preview gives some (`--url`):
// straight to the one, or to each from a list that drops on hover.

function nameParts(): HTMLElement[] {
  return [
    createElement('span', { className: 'ln-ext-preview-name__label', text: 'Preview' }),
    createElement('span', { className: 'ln-ext-preview-name__name', text: PREVIEW_NAME }),
  ];
}

function buildMenu(links: readonly PreviewLink[]): HTMLElement {
  const tag = createElement('div', {
    className: 'ln-ext-preview-name ln-ext-preview-name--menu',
    attrs: { tabindex: '0' },
  });
  const chevron = createElement('span', { className: 'ln-ext-preview-name__chevron' });
  setHtml(chevron, hugeicon(ArrowDown01Icon));
  const list = createElement('div', { className: 'ln-ext-preview-name__links' });
  list.append(
    ...links.map(({ label, href }) => createElement('a', { text: label, attrs: { href } })),
  );
  tag.append(...nameParts(), chevron, list);
  return tag;
}

function buildTag(): HTMLElement {
  const [only, ...more] = PREVIEW_LINKS;
  if (more.length > 0) return buildMenu(PREVIEW_LINKS);
  const tag =
    only === undefined
      ? createElement('div', { className: 'ln-ext-preview-name' })
      : createElement('a', { className: 'ln-ext-preview-name', attrs: { href: only.href } });
  tag.append(...nameParts());
  return tag;
}

export const previewName: Feature = {
  name: 'preview name',
  start: () => {
    if (PREVIEW_NAME === '') return;
    onDomReady(() => document.body.append(buildTag()));
  },
};
