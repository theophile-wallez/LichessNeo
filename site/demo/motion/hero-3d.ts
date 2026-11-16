import { animate, scroll } from 'motion';
import { queryOne } from '#shared/dom.ts';

// The hero window's 3D cascade: the chassis lies back in perspective (rotateX: 28deg,
// standing up to 0deg as the page scrolls), and each part of the review drops softly
// in a wave onto the window's own plane (z -> 0px), its shadow vanishing as it lands.

interface LayerSpec {
  readonly selector: string;
  readonly lift: number;
}

const LAYERS: readonly LayerSpec[] = [
  { selector: '.demo-rail', lift: 0.7 },
  { selector: "[data-player='black']", lift: 0.8 },
  { selector: '.demo-boardrow', lift: 1.05 },
  { selector: "[data-player='white']", lift: 0.82 },
  { selector: '.demo-tabs', lift: 0.85 },
  { selector: '.demo-graph', lift: 1.1 },
  { selector: '.demo-moments', lift: 1.15 },
  { selector: '.demo-moves:not(.demo-moves--plain)', lift: 0.88 },
  { selector: '.demo-controls', lift: 0.92 },
  { selector: '.demo-card', lift: 1.38 },
  { selector: '.ln-ext-review__nav', lift: 1.15 },
];

const BASE_Z = 55;
const BASE_Y = -6;
const FIRST_DELAY = 0.06;
const STEP_DELAY = 0.062;

function lyingScale(demo: HTMLElement): number {
  const room = document.documentElement.clientWidth - 48;
  return Math.min(1.12, Math.max(1, room / demo.offsetWidth));
}

function standUp(demo: HTMLElement, stage: HTMLElement): void {
  const scale = lyingScale(demo);
  scroll(
    animate(demo, { rotateX: [28, 0], scale: [scale, 1], y: ['-2.5%', '0%'] }, { ease: 'linear' }),
    {
      target: demo,
      offset: ['start end', 'start 0.2'],
    },
  );
  const pickers = queryOne(stage, '.demo-pickers', HTMLElement);
  if (!pickers) return;
  const syncPickers = (): void => {
    if (window.scrollY > 90) pickers.dataset.shown = '';
    else delete pickers.dataset.shown;
  };
  syncPickers();
  window.addEventListener('scroll', syncPickers, { passive: true });
}

interface ResolvedLayer {
  readonly element: HTMLElement;
  readonly spec: LayerSpec;
  readonly index: number;
}

function resolveLayers(demo: HTMLElement): ResolvedLayer[] {
  const found: ResolvedLayer[] = [];
  for (const [index, spec] of LAYERS.entries()) {
    const element = queryOne(demo, spec.selector, HTMLElement);
    if (!element) continue;
    element.dataset.layer = '';
    found.push({ element, spec, index });
  }
  return found;
}

function cleanupAssembly(demo: HTMLElement, layers: readonly ResolvedLayer[]): void {
  delete demo.dataset.assembling;
  for (const { element } of layers) {
    delete element.dataset.layer;
    element.style.removeProperty('--drop-z');
    element.style.removeProperty('--drop-y');
    element.style.removeProperty('--air');
    element.style.removeProperty('opacity');
  }
}

function dropLayer(layer: ResolvedLayer, factor: number, delayOffset: number): Promise<void>[] {
  const { element, spec, index } = layer;
  const startZ = Math.round(BASE_Z * spec.lift * factor);
  const startY = Math.round(BASE_Y * spec.lift * factor);
  const delay = delayOffset + FIRST_DELAY + index * STEP_DELAY;
  const fade = animate(element, { opacity: [0, 1] }, { duration: 0.34, ease: 'easeOut', delay });
  const drop = animate(0, 1, {
    type: 'spring',
    visualDuration: 0.76,
    bounce: 0.14,
    delay,
    onUpdate: progress => {
      const rest = 1 - progress;
      element.style.setProperty('--drop-z', `${(startZ * rest).toFixed(1)}px`);
      element.style.setProperty('--drop-y', `${(startY * rest).toFixed(1)}px`);
      element.style.setProperty('--air', Math.max(0, rest).toFixed(3));
    },
  });
  return [fade.then(() => undefined), drop.then(() => undefined)];
}

export async function playHeroCascade(
  stage: HTMLElement,
  demo: HTMLElement,
  delayOffset: number,
): Promise<void> {
  standUp(demo, stage);
  const factor = stage.clientWidth <= 900 ? 0.45 : 1;
  const layers = resolveLayers(demo);
  demo.dataset.assembling = '';

  for (const { element, spec } of layers) {
    element.style.opacity = '0';
    element.style.setProperty('--drop-z', `${Math.round(BASE_Z * spec.lift * factor)}px`);
    element.style.setProperty('--drop-y', `${Math.round(BASE_Y * spec.lift * factor)}px`);
    element.style.setProperty('--air', '1');
  }

  const stageRise = animate(
    stage,
    { opacity: [0, 1], y: [68, 0] },
    { type: 'spring', visualDuration: 0.9, bounce: 0.12, delay: delayOffset },
  );

  const landings: Promise<void>[] = [stageRise.then(() => undefined)];
  for (const layer of layers) landings.push(...dropLayer(layer, factor, delayOffset));

  await Promise.all(landings);
  cleanupAssembly(demo, layers);
}
