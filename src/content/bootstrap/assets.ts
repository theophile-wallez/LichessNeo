import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { extensionUrl } from '#content/platform/runtime.ts';

// Where the extension's files are, on <html> as `data-lr-ext-assets`: the page
// world can't ask chrome.runtime. Set from document_start, it's also the mark
// that the content script is in.

export const assets: Feature = {
  name: 'assets',
  start: () => setData(document.documentElement, 'lrExtAssets', extensionUrl('')),
};
