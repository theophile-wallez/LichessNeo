// WCAG's contrast ratio, for the theme editor's warning on an accent that
// white text can't be read on: primary buttons write white over the accent.

const channel = (value: number): number => {
  const share = value / 255;
  return share <= 0.04045 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
};

/** The relative luminance of a `#rrggbb` color. */
function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map(start =>
    channel(Number.parseInt(hex.slice(start, start + 2), 16)),
  );
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

export const contrastWithWhite = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

/** Below this, white bold text on the accent is hard to read. */
export const MIN_CONTRAST_WITH_WHITE = 3;
