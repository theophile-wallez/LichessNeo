import { clamp } from '#shared/math.ts';
import type { EngineKind, ReviewEngine } from './options.ts';

// What the browser says of the device, and the engines the Debrief runs on it:
// one per core but one, left to the page, as far as the memory allows.

/** More barely help: the analysis is then held up by the cloud and the page. */
const SUGGESTED_MAX = 3;
/** Gigabytes per engine, so a small machine keeps room for the rest of the browser. */
const GIGABYTES: Record<EngineKind, number> = { light: 2, full: 3 };
/** Without the device's memory (Firefox doesn't tell), no more than this. */
const UNKNOWN_MEMORY: Record<EngineKind, number> = { light: 2, full: 1 };

/** The device's logical cores. */
export const deviceCores = (): number => navigator.hardwareConcurrency || 2;

/** Its memory in gigabytes, rounded down by the browser (at most 8), if it tells. */
export function deviceMemory(): number | null {
  const memory: unknown = Reflect.get(navigator, 'deviceMemory');
  return typeof memory === 'number' && memory > 0 ? memory : null;
}

/** The cores the analysis takes unless the user picks: one engine on each. */
export function suggestedCores(engine: EngineKind): number {
  const memory = deviceMemory();
  const byMemory =
    memory === null ? UNKNOWN_MEMORY[engine] : Math.floor(memory / GIGABYTES[engine]);
  return clamp(Math.min(deviceCores() - 1, byMemory), 1, SUGGESTED_MAX);
}

/** The cores picked, or the device's suggestion, never more than it has. */
export const coresOf = (options: ReviewEngine): number =>
  clamp(options.cores ?? suggestedCores(options.engine), 1, deviceCores());

/** The engines the cores make, each with its threads. */
export const engineCount = (options: ReviewEngine): number =>
  Math.max(1, Math.floor(coresOf(options) / options.threads));
