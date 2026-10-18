import { trustedHtml, type SafeHtml } from './html.ts';
import { hugeiconMarkup, type HugeIcon, type IconOptions } from './hugeicons-svg.ts';

// The interface's icons are Hugeicons' free ones (@hugeicons/core-free-icons,
// MIT): imported one by one and drawn inline in the text's color here, or
// written as files for the stylesheets (img/hugeicons, by `pnpm icons`).

export type { HugeIcon };

/** The icon inline, sized by `.ln-ext-hi` (styles/theme/hugeicons/) to the text around it. */
export const hugeicon = (icon: HugeIcon, options: IconOptions = {}): SafeHtml => {
  const className = options.className ? `ln-ext-hi ${options.className}` : 'ln-ext-hi';
  // The package's own constants, every value escaped: no outside markup gets in.
  return trustedHtml(hugeiconMarkup(icon, { ...options, className }));
};
