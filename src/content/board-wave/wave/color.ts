// The wave's colours (after distortion-waves, MIT): palettes of sRGB colours,
// which the shader blends in Oklab, so a gradient between two hues stays bright.

export type Rgb = readonly [red: number, green: number, blue: number];

export interface Palette {
  readonly colors: readonly Rgb[];
  /** The fringe riding ahead of the front. */
  readonly ahead: Rgb;
  /** The fringe trailing behind it. */
  readonly behind: Rgb;
}

export type PaletteName = 'colorful' | 'green' | 'ocean' | 'sunset' | 'mono';

export const PALETTES: Readonly<Record<PaletteName, Palette>> = {
  colorful: {
    colors: [
      [255, 201, 21],
      [126, 196, 255],
      [180, 40, 230],
      [235, 100, 160],
      [255, 176, 122],
      [154, 160, 255],
      [127, 217, 238],
    ],
    ahead: [255, 122, 182],
    behind: [90, 190, 255],
  },
  green: {
    colors: [
      [53, 186, 0],
      [140, 235, 90],
      [0, 196, 110],
      [190, 250, 130],
      [40, 160, 60],
      [110, 225, 160],
      [90, 210, 40],
    ],
    ahead: [196, 255, 120],
    behind: [0, 150, 70],
  },
  ocean: {
    colors: [
      [40, 120, 255],
      [90, 200, 255],
      [20, 80, 200],
      [120, 230, 240],
      [60, 150, 255],
      [150, 180, 255],
      [0, 180, 220],
    ],
    ahead: [150, 230, 255],
    behind: [30, 70, 220],
  },
  sunset: {
    colors: [
      [255, 140, 60],
      [255, 90, 120],
      [255, 200, 80],
      [240, 70, 90],
      [255, 170, 120],
      [220, 90, 200],
      [255, 120, 80],
    ],
    ahead: [255, 220, 120],
    behind: [200, 60, 160],
  },
  mono: {
    colors: [
      [240, 240, 245],
      [200, 205, 215],
      [255, 255, 255],
      [170, 175, 190],
      [225, 228, 235],
      [190, 195, 205],
      [245, 245, 250],
    ],
    ahead: [255, 255, 255],
    behind: [160, 165, 180],
  },
};

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

const mix = (from: Rgb, to: Rgb, share: number): Rgb => [
  from[0] + (to[0] - from[0]) * share,
  from[1] + (to[1] - from[1]) * share,
  from[2] + (to[2] - from[2]) * share,
];

/** One colour, lighter ahead of the front and deeper behind it. */
export const singlePalette = (color: Rgb): Palette => ({
  colors: [color, mix(color, WHITE, 0.25), color, mix(color, BLACK, 0.15)],
  ahead: mix(color, WHITE, 0.45),
  behind: mix(color, BLACK, 0.3),
});

/** A colour as `#rrggbb`, or null for anything else. */
export function parseHex(hex: string): Rgb | null {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) return null;
  const [, red = '', green = '', blue = ''] = match;
  return [Number.parseInt(red, 16), Number.parseInt(green, 16), Number.parseInt(blue, 16)];
}

const linear = (channel: number): number => {
  const value = channel / 255;
  return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

/** An sRGB colour in Oklab: lightness, then its green-red and blue-yellow axes. */
export function oklab([red, green, blue]: Rgb): readonly [number, number, number] {
  const [redLinear, greenLinear, blueLinear] = [linear(red), linear(green), linear(blue)];
  const long = Math.cbrt(
    0.412_221_470_8 * redLinear + 0.536_332_536_3 * greenLinear + 0.051_445_992_9 * blueLinear,
  );
  const medium = Math.cbrt(
    0.211_903_498_2 * redLinear + 0.680_699_545_1 * greenLinear + 0.107_396_956_6 * blueLinear,
  );
  const short = Math.cbrt(
    0.088_302_461_9 * redLinear + 0.281_718_837_6 * greenLinear + 0.629_978_700_5 * blueLinear,
  );
  return [
    0.210_454_255_3 * long + 0.793_617_785 * medium - 0.004_072_046_8 * short,
    1.977_998_495_1 * long - 2.428_592_205 * medium + 0.450_593_709_9 * short,
    0.025_904_037_1 * long + 0.782_771_766_2 * medium - 0.808_675_766 * short,
  ];
}
