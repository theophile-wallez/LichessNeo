import { createElement, setStyleProperty } from '#shared/dom.ts';
import type { Palette } from './color.ts';
import { closeSandbox } from './capture/defaults.ts';
import { snapshot } from './capture/snapshot.ts';
import { smoothStep } from './easing.ts';
import { type Rect, waveFront } from './front.ts';
import { WaveRenderer } from './renderer.ts';
import { rimLumps } from './rim.ts';
import {
  type StyleChanges,
  waveDuration,
  waveStyle,
  type WaveStyle,
  type WaveType,
} from './style.ts';

// One wave over the board: a clear canvas of ours, fixed over the board's box
// in the page's body, where Lichess's redraws can't reach it. It sets off at
// once, and bends a picture of the board as soon as it's taken, easing its lens
// in. Without WebGL 2 there is no wave; without a picture, the colour crosses
// the board alone.

/** The wave's lengths are tuned on a phone's screen: a board gets a wave of the same proportions. */
const PHONE_AREA = 393 * 852;
const MAX_PIXELS = 9_000_000;
/** How long the lens takes to ease in once the picture is in. */
const LENS_IN_MS = 150;

export interface WavePlan {
  readonly type: WaveType;
  /** Where the wave starts, in fractions of the board's width and height. */
  readonly source: Rect;
  readonly palette: Palette;
  readonly changes?: StyleChanges;
}

interface Geometry {
  readonly width: number;
  readonly height: number;
  /** CSS pixels per point. */
  readonly points: number;
  /** Canvas pixels per CSS pixel. */
  readonly scale: number;
}

function geometryOf(box: DOMRect, maxTextureSize: number): Geometry {
  const { width, height } = box;
  const points = Math.min(Math.max(Math.sqrt((width * height) / PHONE_AREA), 0.6), 2.2);
  const scale = Math.min(
    window.devicePixelRatio || 1,
    Math.sqrt(MAX_PIXELS / Math.max(width * height, 1)),
    maxTextureSize / Math.max(width, height, 1),
  );
  return { width, height, points, scale };
}

function styleFor(plan: WavePlan, geometry: Geometry, corner: number): WaveStyle {
  const base = waveStyle(plan.type, plan.changes);
  // The hairline grows with the square root of the scale: a larger board wants a firmer line, not a thick one.
  return {
    ...base,
    palette: plan.palette,
    cornerRadius: corner / geometry.points,
    hairlineWidth: base.hairlineWidth / Math.sqrt(geometry.points),
  };
}

function place(layer: HTMLElement, box: DOMRect): void {
  setStyleProperty(layer, 'left', `${box.left}px`);
  setStyleProperty(layer, 'top', `${box.top}px`);
  setStyleProperty(layer, 'width', `${box.width}px`);
  setStyleProperty(layer, 'height', `${box.height}px`);
}

interface Run {
  readonly board: HTMLElement;
  readonly layer: HTMLElement;
  readonly renderer: WaveRenderer;
  readonly style: WaveStyle;
  readonly geometry: Geometry;
  readonly source: Rect;
  /** When the picture came in, or null before it does. */
  pictureAt: number | null;
  /** The wave is over, its renderer gone: a picture that comes now is dropped. */
  done: boolean;
}

function startRun(board: HTMLElement, plan: WavePlan): Run | null {
  const canvas = createElement('canvas');
  const renderer = WaveRenderer.create(canvas);
  if (!renderer) return null;
  const box = board.getBoundingClientRect();
  const geometry = geometryOf(box, renderer.maxTextureSize);
  const corner = Number.parseFloat(getComputedStyle(board).borderTopLeftRadius) || 0;
  const layer = createElement('div', {
    className: 'ln-ext-board-wave',
    attrs: { 'aria-hidden': 'true' },
  });
  setStyleProperty(layer, 'border-radius', `${corner}px`);
  canvas.width = Math.max(1, Math.round(geometry.width * geometry.scale));
  canvas.height = Math.max(1, Math.round(geometry.height * geometry.scale));
  layer.append(canvas);
  place(layer, box);
  document.body.append(layer);
  const { points } = geometry;
  renderer.setArea({ width: geometry.width / points, height: geometry.height / points });
  const { source } = plan;
  return {
    board,
    layer,
    renderer,
    style: styleFor(plan, geometry, corner),
    geometry,
    source: {
      x: (source.x * geometry.width) / points,
      y: (source.y * geometry.height) / points,
      width: (source.width * geometry.width) / points,
      height: (source.height * geometry.height) / points,
    },
    pictureAt: null,
    done: false,
  };
}

function drawFrame(run: Run, progress: number, now: number): void {
  const { geometry, style } = run;
  const area = {
    x: 0,
    y: 0,
    width: geometry.width / geometry.points,
    height: geometry.height / geometry.points,
  };
  const front = waveFront(progress, run.source, area, style);
  const lumps = rimLumps(front.time, {
    width: area.width,
    height: area.height,
    cornerRadius: style.cornerRadius,
    pulse: style.rimPulse,
  });
  const gain = run.pictureAt === null ? 0 : smoothStep(0, LENS_IN_MS, now - run.pictureAt);
  run.renderer.render({ front, style, lumps, gain });
}

async function takePicture(run: Run): Promise<void> {
  try {
    const canvas = await snapshot({ root: run.board, ...run.geometry });
    if (!canvas || run.done) return;
    run.renderer.setPicture(canvas, run.style.blur);
    run.pictureAt = performance.now();
  } catch (error) {
    console.warn('[LichessNeo] board wave picture', error);
  }
}

/** Compiles the wave's shaders once ahead, so the browser has them at hand when it plays. */
export function warmWave(): void {
  WaveRenderer.create(createElement('canvas'))?.dispose();
}

/**
 * Plays `plan` over `findBoard()`'s board, found again each frame as Lichess may draw it anew;
 * resolves once done, or as `signal` aborts it.
 */
export async function playWave(
  findBoard: () => HTMLElement | null,
  plan: WavePlan,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) return;
  const board = findBoard();
  const run = board && startRun(board, plan);
  if (!run) return;
  void takePicture(run);
  const total = waveDuration(run.style) * 1000;
  await new Promise<void>(resolve => {
    let start: number | null = null;
    const tick = (now: number): void => {
      start ??= now;
      const shown = findBoard();
      const progress = (now - start) / total;
      if (!shown || progress >= 1 || signal?.aborted) {
        resolve();
        return;
      }
      place(run.layer, shown.getBoundingClientRect());
      drawFrame(run, progress, now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  run.done = true;
  run.renderer.dispose();
  run.layer.remove();
  closeSandbox();
}
