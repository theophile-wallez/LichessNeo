import { trustedHtml, type SafeHtml } from '#shared/html.ts';

// The game over's white glyphs, on the kings' badges.

const svg = (body: string): SafeHtml =>
  trustedHtml(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`,
  );

export const ICONS = {
  crown: svg(
    '<path stroke-width="1.2" d="M3.5 17.5 2.5 7.5l5.5 4.2L12 5l4 6.7 5.5-4.2-1 10z"/><rect x="3.5" y="19" width="17" height="2.2" rx="1" stroke="none"/>',
  ),
  flag: svg(
    '<path fill="none" stroke-width="2.2" d="M6 21V3.5"/><path stroke-width="1.2" d="M7 4.5h11l-2.8 4.3L18 13H7z"/>',
  ),
  clock: svg(
    '<circle cx="12" cy="12" r="8.2" fill="none" stroke-width="2.4"/><path fill="none" stroke-width="2.4" d="M12 7.5V12l3.2 2.2"/>',
  ),
  mate: svg(
    '<path fill="none" stroke-width="2.6" d="M9.8 4 8.2 20M15.8 4l-1.6 16M4.8 9.2h15.4M3.8 14.8h15.4"/>',
  ),
  half: svg(
    '<text x="12" y="18" stroke="none" font-family="Arial, sans-serif" font-size="18" font-weight="800" text-anchor="middle">½</text>',
  ),
  cross: svg('<path fill="none" stroke-width="2.8" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
} satisfies Record<string, SafeHtml>;

export type IconName = keyof typeof ICONS;
