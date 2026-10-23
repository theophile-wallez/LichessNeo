// Lichess's Theme menu has a Roundness slider, which sets `---ui-roundness`
// on <html> (0 to 15px, 8 by default). The stylesheet writes its corners in
// pixels as they look at the default, and the build scales each one by the
// slider through `--ln-ext-radius-px` (`styles/theme/base.css`). A pill
// (99px and up) and a percentage, a circle, keep their shape.

const RADIUS_DECLARATION = /([\s;{](?:--[\w-]+-|border-(?:[a-z]+-)*)radius\s*:)([^;}]*)/g;
const PIXELS = /(?<![\w.-])(\d*\.?\d+)px\b/g;
const PILL_PX = 99;

function scalePixels(value: string): string {
  return value.replace(PIXELS, (length, amount: string) =>
    Number(amount) === 0 || Number(amount) >= PILL_PX
      ? length
      : `calc(var(--ln-ext-radius-px) * ${amount})`,
  );
}

/** The stylesheet with its corners following Lichess's Roundness. */
export function scaleRadii(css: string): string {
  return css.replace(
    RADIUS_DECLARATION,
    (_declaration, property: string, value: string) => property + scalePixels(value),
  );
}
