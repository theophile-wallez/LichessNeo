import {
  BACKLIT,
  type BacklitLight,
  BacklitLightSchema,
  type BacklitReach,
  BacklitReachSchema,
  type BacklitSettings,
  type BacklitWaves,
  BacklitWavesSchema,
  DEFAULT_KEY_SHAPE,
  KEY_GAP_MAX,
  KEY_RADIUS_MAX,
  KeyGapSchema,
  KeyRadiusSchema,
} from '#shared/backlit.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { type SoundPlace, SoundPlaceSchema, SYNTH_SET } from '#shared/sounds.ts';
import { StorageKey } from '#shared/storage.ts';
import { colorRow, saveRow } from './color-row.ts';
import type { Library } from './library.ts';
import { optionRow, type OptionRowSpec } from './option-row.ts';
import { sliderRow } from './slider-row.ts';
import { storedNumber, storedOption } from './stored-option.ts';
import { strengthRow, textureRow } from './texture-row.ts';

// The settings of the extension's themes, each a row in its panel: the custom
// board's colors and texture and where the sound set puts a move's sound,
// under the list, and how the backlit boards light up and the shape of their
// keys, in their family's view, the same for them all.

export const soundPlace = storedOption<SoundPlace>(
  StorageKey.soundPlace,
  SoundPlaceSchema,
  'space',
);

const backlitLight = storedOption<BacklitLight>(
  StorageKey.backlitLight,
  BacklitLightSchema,
  'accent',
);
const backlitReach = storedOption<BacklitReach>(
  StorageKey.backlitReach,
  BacklitReachSchema,
  'short',
);
const backlitWaves = storedOption<BacklitWaves>(
  StorageKey.backlitWaves,
  BacklitWavesSchema,
  'captures',
);

const backlitGap = storedNumber(StorageKey.backlitGap, KeyGapSchema, DEFAULT_KEY_SHAPE.gap);
const backlitRadius = storedNumber(
  StorageKey.backlitRadius,
  KeyRadiusSchema,
  DEFAULT_KEY_SHAPE.radius,
);

export const readBacklit = (): BacklitSettings => ({
  light: backlitLight.read(),
  reach: backlitReach.read(),
  waves: backlitWaves.read(),
  shape: { gap: backlitGap.read(), radius: backlitRadius.read() },
});

export function onBacklitChange(listener: () => void): void {
  for (const setting of [backlitLight, backlitReach, backlitWaves, backlitGap, backlitRadius])
    setting.onChange(listener);
}

const PLACE_ROW: OptionRowSpec<SoundPlace> = {
  theme: SYNTH_SET,
  label: 'Placement',
  setting: soundPlace,
  options: [
    { value: 'space', label: '3D', tip: 'Around you, as from the board: best with headphones' },
    { value: 'stereo', label: 'Stereo', tip: 'A little to the left or right, by the file' },
    { value: 'none', label: 'Off', tip: 'Every sound from the middle' },
  ],
};

const LIGHT_ROW: OptionRowSpec<BacklitLight> = {
  label: 'Light',
  setting: backlitLight,
  options: [
    { value: 'accent', label: 'Accent', tip: 'The color of your theme' },
    { value: 'board', label: 'Board', tip: 'Each board’s own color' },
    { value: 'rainbow', label: 'Rainbow', tip: 'Every color, around the square' },
    { value: 'sides', label: 'Sides', tip: 'One color for White, one for Black' },
  ],
};

const REACH_ROW: OptionRowSpec<BacklitReach> = {
  label: 'Wave',
  setting: backlitReach,
  options: [
    { value: 'short', label: 'Short', tip: 'The squares around the move' },
    { value: 'medium', label: 'Medium', tip: 'Half the board' },
    { value: 'wide', label: 'Wide', tip: 'Most of the board' },
  ],
};

const WAVES_ROW: OptionRowSpec<BacklitWaves> = {
  label: 'Waves on',
  setting: backlitWaves,
  options: [
    {
      value: 'captures',
      label: 'Captures',
      tip: 'Captures and promotions; other moves light their square only',
    },
    { value: 'always', label: 'Every move', tip: 'A wave on every move' },
  ],
};

type Rows = readonly ((library: Library) => HTMLElement)[];

/** A panel's rows, under its list. */
export const OPTION_ROWS: Readonly<Record<PartKind, Rows>> = {
  board: [() => colorRow('light'), () => colorRow('dark'), textureRow, strengthRow, saveRow],
  piece: [],
  sound: [() => optionRow(PLACE_ROW)],
};

/** A family's rows, under its boards in its view. */
export const FAMILY_ROWS: Readonly<Record<string, readonly (() => HTMLElement)[]>> = {
  [BACKLIT]: [
    () => optionRow(LIGHT_ROW),
    () => optionRow(REACH_ROW),
    () => optionRow(WAVES_ROW),
    () =>
      sliderRow({
        label: 'Gap',
        setting: backlitGap,
        min: 0,
        max: KEY_GAP_MAX,
        step: 0.5,
        fallback: DEFAULT_KEY_SHAPE.gap,
      }),
    () =>
      sliderRow({
        label: 'Corners',
        setting: backlitRadius,
        min: 0,
        max: KEY_RADIUS_MAX,
        step: 0.2,
        fallback: DEFAULT_KEY_SHAPE.radius,
      }),
  ],
};
