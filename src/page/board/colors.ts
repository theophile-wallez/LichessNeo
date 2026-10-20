// Our colors for Lichess's brushes, as "r,g,b". They're keyed by the stroke
// color chessground paints with, because the brush names don't reach the svg.

const GREEN = '#15781B';
const RED = '#882020';
const BLUE = '#003088';

// Lichess's default green brush becomes our orange, and its yellow brush becomes our green.
const ARROWS: ReadonlyMap<string, string> = new Map([
  [GREEN, '255,170,0'],
  [RED, '248,85,63'],
  [BLUE, '72,193,249'],
  ['#e68f00', '159,207,63'],
  ['#4a4a4a', '200,200,200'],
  ['#68217a', '170,110,210'],
  ['#ee2080', '238,32,128'],
  ['#ffffff', '255,255,255'],
]);

// Right-clicked squares are red by default, so Lichess's default brush fills
// them in our red, and its red brush uses orange instead to stay distinct.
const SQUARES: ReadonlyMap<string, string> = new Map([
  ...ARROWS,
  [GREEN, '235,97,80'],
  [RED, '255,170,0'],
]);

const DEFAULT_ARROW = '255,170,0';
const DEFAULT_SQUARE = '235,97,80';

export const arrowColor = (stroke: string | null): string =>
  ARROWS.get(stroke ?? '') ?? DEFAULT_ARROW;

export const squareColor = (stroke: string | null): string =>
  SQUARES.get(stroke ?? '') ?? DEFAULT_SQUARE;

/** The Game Review's best move, in green. */
export const REVIEW_COLOR = '159,207,63';
/** The reply that punishes an error, in red. */
export const THREAT_COLOR = '235,88,72';
/** The coach's drawing of a plan, in amber: it stands out on blue boards and brown ones alike. */
export const PLAN_COLOR = '250,180,40';
/** The coach's runs along a line: the computer level slider's blue (styles/pages/level-slider.css) at the piece, our purple at the ends. */
export const RUN_COLOR = '79,140,255';
export const RUN_END_COLOR = '139,92,246';
/** The variation the analysis board follows, among several, in our blue; the others in grey. */
export const VARIATION_PICKED_COLOR = '72,193,249';
export const VARIATION_COLOR = '200,200,200';
/** The engine's move after one played off the game, in Lichess's pale blue. */
export const ENGINE_COLOR = '72,193,249';
