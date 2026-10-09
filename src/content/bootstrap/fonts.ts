import { createElement, onDomReady } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';

// Lichess sets light (300) weights on Roboto and Noto Sans all over the site.
// We point those families (and our own 'LR Ext Sans') at the system UI font, so
// light weights render as regular. The faces must come after Lichess's own to
// win, so they're added to <head> rather than put in the manifest CSS.

const FAMILIES = ['Roboto', 'Noto Sans', 'LR Ext Sans'];

const WEIGHTS: readonly (readonly [range: string, sources: readonly string[]])[] = [
  ['100 450', ['Segoe UI', 'SegoeUI', 'Helvetica Neue', 'Roboto']],
  ['451 650', ['Segoe UI Semibold', 'SegoeUI-Semibold', 'HelveticaNeue-Medium', 'Roboto Medium']],
  ['651 850', ['Segoe UI Bold', 'SegoeUI-Bold', 'HelveticaNeue-Bold', 'Roboto Bold']],
  ['851 1000', ['Segoe UI Black', 'SegoeUI-Black', 'HelveticaNeue-Bold', 'Roboto Black']],
];

export function fontFaces(): string {
  return FAMILIES.flatMap(family =>
    WEIGHTS.map(([range, sources]) => {
      const src = sources.map(name => `local('${name}')`).join(', ');
      return `@font-face{font-family:'${family}';font-weight:${range};src:${src}}`;
    }),
  ).join('');
}

export const fonts: Feature = {
  name: 'fonts',
  start: () =>
    onDomReady(() => {
      document.head.append(createElement('style', { id: 'lr-ext-fonts', text: fontFaces() }));
    }),
};
