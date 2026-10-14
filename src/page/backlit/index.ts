import { type BacklitSettings, readBacklitWords } from '#shared/backlit.ts';
import { wrapOrientation } from '#shared/chessground.ts';
import type { Color } from '#shared/chess/types.ts';
import type { Feature } from '#shared/features.ts';
import { oncePerFrame } from '#shared/frame.ts';
import { createLayer, type Layer } from './layer.ts';
import type { Spread } from './effects.ts';
import { createScene, type Paint, type Scene } from './scene.ts';
import { type Arrival, watchMoves } from './watch.ts';

// The backlit board's light (#shared/backlit.ts), on the main board only:
// mini boards keep its keys, unlit. Until the board is picked, this only
// watches one attribute of <html>, so other boards cost nothing.

const BOARD = '.is2d main .main-board cg-board';
const CHECK_COLOR = '#ff4d5e';

const readSettings = (): BacklitSettings | null =>
  readBacklitWords(document.documentElement.dataset.lrExtBacklit);

function paintFor(settings: BacklitSettings, mover: Color, layer: Layer): Paint {
  if (settings.light === 'rainbow') return 'rainbow';
  return { color: settings.light === 'sides' ? layer.side(mover) : layer.glow() };
}

// A capture's or a promotion's wave is a strong one; a quiet move's, its key only, if waves
// are for those.
function spreadOf(arrival: Arrival, { waves }: BacklitSettings): Spread {
  if (arrival.strong) return 'strong';
  return waves === 'always' ? 'wave' : 'key';
}

function lightUp(arrival: Arrival, scene: Scene, layer: Layer): void {
  const settings = readSettings();
  if (!settings) return;
  const now = performance.now();
  const spread = spreadOf(arrival, settings);
  const paint = paintFor(settings, arrival.color, layer);
  scene.wave({ square: arrival.to, spread, reach: settings.reach, paint }, now);
  if (arrival.check) scene.pulse(arrival.check, CHECK_COLOR, now);
  layer.wake();
}

/** Lights the main board, and the next one as boards come and go; returns the stop. */
function startLight(): () => void {
  const scene = createScene();
  const orientation = (): Color => {
    const wrap = tracked?.board.closest('.cg-wrap');
    return wrap ? wrapOrientation(wrap) : 'white';
  };
  const layer = createLayer({
    scene,
    hoverColor: () => {
      const settings = readSettings();
      return settings?.light === 'sides' ? layer.side(orientation()) : layer.glow();
    },
  });
  let tracked: { board: Element; stop: () => void } | null = null;

  const find = (): void => {
    const board = document.querySelector(BOARD);
    const container = board?.parentElement;
    if (!board || !container || board === tracked?.board) return;
    tracked?.stop();
    tracked = { board, stop: watchMoves(board, arrival => lightUp(arrival, scene, layer)) };
    layer.attach({ container, orientation });
  };
  const findSoon = oncePerFrame(find);
  // Boards are drawn after load, replaced by the next puzzle or a redraw: look
  // again only once the one followed has gone.
  const pages = new MutationObserver(() => {
    if (!tracked?.board.isConnected) findSoon();
  });
  pages.observe(document.documentElement, { childList: true, subtree: true });
  find();
  return () => {
    pages.disconnect();
    tracked?.stop();
    layer.remove();
  };
}

function start(): void {
  let stop: (() => void) | null = null;
  const sync = (): void => {
    const on = readSettings() !== null;
    if (on && !stop) stop = startLight();
    if (!on && stop) {
      stop();
      stop = null;
    }
  };
  new MutationObserver(sync).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lr-ext-backlit'],
  });
  sync();
}

export const backlit: Feature = { name: 'backlit board', start };
