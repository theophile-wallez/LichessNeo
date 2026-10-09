// Test support for the charts' attribute and CSS variable names, which got
// the `lr-ext` prefix in the port.

const RENAMED: readonly (readonly [port: string, original: string])[] = [
  ['--lr-ext-series-color:', '--c:'],
  ['--lr-ext-marker-color:', '--c:'],
  ['--lr-ext-bar-index:', '--k:'],
  ['data-lr-ext-series=', 'data-i='],
  ['data-lr-ext-bar=', 'data-i='],
  ['data-lr-ext-range=', 'data-range='],
];

/** Puts the original's names back, to compare our markup with its recordings. */
export const withLegacyNames = (markup: string): string =>
  RENAMED.reduce((text, [port, original]) => text.replaceAll(port, original), markup);

const CUSTOM_PROPERTY = /(--[\w-]+)\s*:/g;

/** The data attributes and CSS variables under `root` that lack the `lr-ext` prefix. */
export function unprefixedNames(root: Element): string[] {
  const names = new Set<string>();
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const name of element.getAttributeNames())
      if (name.startsWith('data-') && !name.startsWith('data-lr-ext-')) names.add(name);
    const style = element.getAttribute('style') ?? '';
    for (const [, property = ''] of style.matchAll(CUSTOM_PROPERTY))
      if (!property.startsWith('--lr-ext-')) names.add(property);
  }
  return [...names];
}
