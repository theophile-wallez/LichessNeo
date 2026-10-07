import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import Clock01Icon from '@hugeicons/core-free-icons/Clock01Icon';
import CrownIcon from '@hugeicons/core-free-icons/CrownIcon';
import Flag01Icon from '@hugeicons/core-free-icons/Flag01Icon';
import HashtagIcon from '@hugeicons/core-free-icons/HashtagIcon';
import { hugeicon } from '#shared/hugeicons.ts';
import { trustedHtml, type SafeHtml } from '#shared/html.ts';

// The game over's white glyphs, on the kings' badges: Hugeicons', and a draw's ½.

const svg = (body: string): SafeHtml =>
  trustedHtml(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`,
  );

export const ICONS = {
  crown: hugeicon(CrownIcon),
  flag: hugeicon(Flag01Icon),
  clock: hugeicon(Clock01Icon),
  mate: hugeicon(HashtagIcon),
  // A draw's ½ is text: no icon says it as well.
  half: svg(
    '<text x="12" y="18" stroke="none" font-family="Arial, sans-serif" font-size="18" font-weight="800" text-anchor="middle">½</text>',
  ),
  cross: hugeicon(Cancel01Icon),
} satisfies Record<string, SafeHtml>;

export type IconName = keyof typeof ICONS;
