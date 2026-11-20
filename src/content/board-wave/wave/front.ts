import { cubicBezier, smoothStep } from './easing.ts';
import { waveDuration, type WaveStyle } from './style.ts';

// Where the wave's front is at a point of its run (after distortion-waves'
// waveFront, MIT): everything on screen is a pure function of that one number.
// The front is a stadium (a ring for `center`) that gathers on its source, then
// grows out past the area's far corner.

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Front {
  readonly originX: number;
  readonly originY: number;
  /** The front's turn, in radians: a quarter for a horizontal wave. */
  readonly tilt: number;
  /** Half the straight part of the stadium, which closes as it opens. */
  readonly spine: number;
  readonly radius: number;
  /** How much wider than tall the front is drawn. */
  readonly squash: number;
  /** Seconds since the run began. */
  readonly time: number;
  /** How strong the lens and the blur are. */
  readonly energy: number;
  readonly swell: number;
  readonly gravity: number;
  readonly glow: number;
  /** The radius inside which the edges' colour has cleared, and their hairline's. */
  readonly clearRadius: number;
  readonly hairClearRadius: number;
  readonly rim: number;
  readonly ring: boolean;
  /** A ring holds still over its source's own radius. */
  readonly hold: number;
}

const COVER_ZONE = 60;
const ARC_SQUASH = 1.4;
const RELEASE = 0.22;
const GATHERED_GLOW = 0.5;
const OVERSHOOT = 100;
const SETTLE_START = 0.2;
const SETTLE_END = 0.55;
const TRAVEL_EASING = cubicBezier([0.22, 1, 0.36, 1]);
const RIM_EASING = cubicBezier([0.42, 0, 0.58, 1]);

/** How far the front must grow from the source's middle to have crossed all of the area. */
function reachOf(source: Rect, area: Rect, squash: number, tilt: number): number {
  const middleX = source.x + source.width / 2;
  const middleY = source.y + source.height / 2;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  let reach = 0;
  for (const [cornerX, cornerY] of [
    [0, 0],
    [area.width, 0],
    [0, area.height],
    [area.width, area.height],
  ] as const) {
    const dx = cornerX - middleX;
    const dy = cornerY - middleY;
    reach = Math.max(reach, Math.hypot((cos * dx + sin * dy) * squash, -sin * dx + cos * dy));
  }
  return reach;
}

interface Timing {
  readonly time: number;
  readonly sinceLaunch: number;
  readonly gathered: number;
  /** 0 to 1 of the front's travel, and the travel eased. */
  readonly along: number;
  readonly moved: number;
}

function timingAt(progress: number, style: WaveStyle): Timing {
  const time = Math.min(Math.max(progress, 0), 1) * waveDuration(style);
  const sinceLaunch = time - style.anticipation;
  const along = Math.min(Math.max(sinceLaunch / style.travel, 0), 1);
  return {
    time,
    sinceLaunch,
    gathered: smoothStep(0, Math.max(style.anticipation, 0.001), time),
    along,
    moved: TRAVEL_EASING(along),
  };
}

/** Where the wave is at `progress`, 0 to 1 of its run, over `area` in points. */
export function waveFront(progress: number, source: Rect, area: Rect, style: WaveStyle): Front {
  const { time, sinceLaunch, gathered, along, moved } = timingAt(progress, style);
  const ring = style.type === 'center';
  const fullSquash = ring ? 1 : ARC_SQUASH;
  const tilt = style.type === 'horizontal' ? Math.PI / 2 : 0;
  const startRadius = Math.min(source.width, source.height) / 2;
  const length = style.type === 'horizontal' ? source.height : source.width;
  const reach = reachOf(source, area, fullSquash, tilt);
  const crossed = reach + (style.swell + COVER_ZONE) * fullSquash;
  const settling = 1 - smoothStep(SETTLE_START, SETTLE_END, along);
  const launchRadius = startRadius + Math.max(style.launchGap, 0);
  const gatheredGlow = Math.min(GATHERED_GLOW * Math.max(style.gatherGlow, 0), 1);
  const clearStart = startRadius - style.rimSoftness;
  const clearEnd = reach + (style.rimSoftness + style.swell) * fullSquash;
  const clearing = (delay: number, fade: number): number =>
    clearStart + (clearEnd - clearStart) * RIM_EASING((sinceLaunch - delay) / Math.max(fade, 0.01));
  return {
    originX: source.x + source.width / 2,
    originY: source.y + source.height / 2,
    tilt,
    spine: (ring ? 0 : Math.max(0, length / 2 - startRadius)) * (1 - smoothStep(0, 0.45, moved)),
    radius:
      sinceLaunch < 0
        ? launchRadius + style.inhale * (1 - gathered)
        : launchRadius + (crossed + OVERSHOOT - launchRadius) * moved,
    squash: 1 + (fullSquash - 1) * smoothStep(0, 0.5, moved),
    time,
    energy: smoothStep(0, 0.05, along) * settling,
    swell: style.swell * smoothStep(0, 0.3, moved),
    gravity: style.pull * gathered * (1 - smoothStep(0, RELEASE, sinceLaunch)),
    glow:
      sinceLaunch < 0
        ? gatheredGlow * gathered
        : (gatheredGlow + (1 - gatheredGlow) * smoothStep(0, 0.07, along)) * settling,
    clearRadius: clearing(style.linger, style.rimFade),
    hairClearRadius: clearing(style.linger + style.hairlineLinger, style.hairlineFade),
    rim:
      style.rimStrength *
      smoothStep(0, 0.1, along) *
      (1 - smoothStep(0.9, 1, time / waveDuration(style))),
    ring,
    hold: ring ? startRadius : 0,
  };
}
