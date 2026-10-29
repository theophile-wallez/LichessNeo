// A Hugeicon as an SVG file, by the name a stylesheet gives it:
// `arrow-left-01` is the package's ArrowLeft01Icon, and `search-01--989795`
// the same icon drawn in #989795 rather than currentColor, for where no mask
// can go. Shared by scripts/icons.ts and scripts/site.ts.

import { z } from 'zod/mini';
import { hugeiconMarkup, type HugeIcon } from '#shared/hugeicons-svg.ts';

/** `img/hugeicons/<name>.svg` in a stylesheet, the name captured. */
export const NAMED_ICON = /img\/hugeicons\/([a-z0-9-]+)\.svg/g;

const COLORED = /^(.+)--([0-9a-f]{6}(?:[0-9a-f]{2})?)$/;

/** `arrow-left-01` → `ArrowLeft01Icon`, the package's own export. */
const exportName = (name: string): string =>
  `${name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}Icon`;

// Each module's default export: the icon's elements and their attributes.
const IconModuleSchema = z.object({
  default: z.array(z.tuple([z.string(), z.record(z.string(), z.union([z.string(), z.number()]))])),
});

async function loadIcon(name: string): Promise<HugeIcon> {
  const module: unknown = await import(`@hugeicons/core-free-icons/${exportName(name)}`);
  return IconModuleSchema.parse(module).default;
}

/** The SVG document of the icon a stylesheet names, ending with a newline. */
export async function iconFile(name: string): Promise<string> {
  const [, icon = name, color] = COLORED.exec(name) ?? [];
  const markup = hugeiconMarkup(await loadIcon(icon));
  return `${color ? markup.replaceAll('currentColor', `#${color}`) : markup}\n`;
}
