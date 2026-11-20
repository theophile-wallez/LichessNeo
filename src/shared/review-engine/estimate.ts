import { z } from 'zod/mini';
import { clamp } from '#shared/math.ts';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import { engineCount } from './device.ts';
import type { EngineKind, ReviewEngine } from './options.ts';

// How long the Debrief takes over a game: the time a search takes at each
// depth, measured on an Apple M1 in Chrome (one thread, two lines, 12
// positions of a game), set right by the searches this device has run since.

const MEASURED: Record<EngineKind, Readonly<Record<number, number>>> = {
  light: { 12: 0.115, 16: 0.611, 18: 1.157, 20: 1.989, 22: 3.51 },
  full: { 12: 0.153, 16: 0.801, 18: 1.759, 20: 3.547 },
};
// Each depth past the table's ends multiplies the time by this.
const BELOW: Record<EngineKind, number> = { light: 1.518, full: 1.513 };
const ABOVE: Record<EngineKind, number> = { light: 1.33, full: 1.42 };
// At a fixed depth, more threads search wider, not sooner: 4 took 0.87 s against 0.61 s.
const PER_EXTRA_THREAD = 0.12;
// The cloud answers the opening's positions.
const SEARCHED_SHARE = 0.85;

function measuredSeconds(engine: EngineKind, depth: number): number {
  const table = MEASURED[engine];
  const depths = Object.keys(table).map(Number);
  const low = Math.min(...depths);
  const high = Math.max(...depths);
  if (depth <= low) return (table[low] ?? 0) / BELOW[engine] ** (low - depth);
  if (depth >= high) return (table[high] ?? 0) * ABOVE[engine] ** (depth - high);
  const below = Math.max(...depths.filter(known => known <= depth));
  const above = Math.min(...depths.filter(known => known >= depth));
  const [from, to] = [table[below] ?? 0, table[above] ?? 0];
  if (below === above) return from;
  const share = (depth - below) / (above - below);
  return Math.exp(Math.log(from) * (1 - share) + Math.log(to) * share);
}

/* ---- The device's own pace --- */

const SpeedSchema = z.partialRecord(z.enum(['light', 'full']), z.number());
// How much each search moves the pace: a few dozen make it the device's.
const LEARNING = 0.05;

const speedOf = (engine: EngineKind): number =>
  readStoredJson(StorageKey.reviewEngineSpeed, SpeedSchema)?.[engine] ?? 1;

/** One search's time, by which the estimates learn the device's pace. */
export function recordSearch(options: ReviewEngine, depth: number, seconds: number): void {
  const expected = measuredSeconds(options.engine, depth) * threadCost(options.threads);
  if (expected <= 0 || seconds <= 0) return;
  const speeds = readStoredJson(StorageKey.reviewEngineSpeed, SpeedSchema) ?? {};
  const current = speeds[options.engine] ?? 1;
  const next = current + (seconds / expected - current) * LEARNING;
  writeStoredJson(StorageKey.reviewEngineSpeed, {
    ...speeds,
    [options.engine]: clamp(next, 0.2, 8),
  });
}

const threadCost = (threads: number): number => 1 + PER_EXTRA_THREAD * (threads - 1);

/** A position's search, in seconds, on this device. */
export function positionSeconds(options: ReviewEngine, depth = options.depth): number {
  const seconds = measuredSeconds(options.engine, depth) * threadCost(options.threads);
  const paced = seconds * speedOf(options.engine);
  return options.cap > 0 ? Math.min(paced, options.cap) : paced;
}

/** A game of `positions` positions, shared between the engines. */
export const gameSeconds = (
  options: ReviewEngine,
  positions: number,
  depth = options.depth,
): number => (positions * SEARCHED_SHARE * positionSeconds(options, depth)) / engineCount(options);

/* ---- As said --- */

// Positions differ: quiet ones go fast, tactics don't.
const LOW = 0.7;
const HIGH = 1.4;

// Seconds by fives; minutes and hours by halves, one at least.
const bySeconds = (value: number): number => Math.max(5, Math.round(value / 5) * 5);
const byHalves = (value: number, size: number): number =>
  Math.max(1, Math.round((value / size) * 2) / 2);

function rounded(seconds: number): { value: [number, number]; unit: 'second' | 'minute' | 'hour' } {
  const [low, high] = [seconds * LOW, seconds * HIGH];
  if (high < 60) return { value: [bySeconds(low), bySeconds(high)], unit: 'second' };
  if (high < 90 * 60) return { value: [byHalves(low, 60), byHalves(high, 60)], unit: 'minute' };
  return { value: [byHalves(low, 3600), byHalves(high, 3600)], unit: 'hour' };
}

/** "10–20 sec", "1.5–3 min": the time a game may take, in the page's language. */
export function durationRange(seconds: number, locale: string | undefined): string {
  const { value, unit } = rounded(seconds);
  const format = new Intl.NumberFormat(locale, { style: 'unit', unit, maximumFractionDigits: 1 });
  const [low, high] = value;
  return low === high ? `≈ ${format.format(low)}` : format.formatRange(low, high);
}
