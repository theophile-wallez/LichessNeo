// The board's wave, bundled apart (board-wave.js): the content script loads
// it only when a wave plays (content/board-wave/load.ts).

export { playWave, warmWave, type WavePlan } from './run.ts';
export { PALETTES, parseHex, singlePalette, type Palette } from './color.ts';
