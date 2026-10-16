// Where each toast of the stack stands, and when a swipe throws one out: Sonner's rules
// (emilkowal.ski/ui/building-a-toast-component), apart from the DOM.

/** The toasts shown at once; older ones wait, hidden, behind them. */
export const VISIBLE_TOASTS = 3;
/** How far each toast behind peeks out over the one in front, collapsed. */
const PEEK = 10;
/** Between two toasts, expanded. */
export const TOAST_GAP = 12;
const SHRINK = 0.05;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Placement {
  /** Up from the stack's bottom edge, in px: negative. */
  readonly y: number;
  readonly scale: number;
  /** Collapsed, a toast behind takes the front one's size, so the stack's edges line up. */
  readonly size: Size;
  readonly hidden: boolean;
}

/** Each toast's place, from their own sizes, the newest first. */
export function placements(sizes: readonly Size[], expanded: boolean): Placement[] {
  const front = sizes[0] ?? { width: 0, height: 0 };
  let above = 0;
  return sizes.map((size, i) => {
    const y = expanded ? -above : -i * PEEK;
    above += size.height + TOAST_GAP;
    return {
      y,
      scale: expanded ? 1 : 1 - i * SHRINK,
      size: expanded ? size : front,
      hidden: i >= VISIBLE_TOASTS,
    };
  });
}

export type Axis = 'x' | 'y';

// A swipe goes sideways or down, out of the window: up, against it, it barely gives.
export function swipeOffset(axis: Axis, delta: number): number {
  if (axis === 'x' || delta >= 0) return delta;
  return delta / (1.5 + Math.abs(delta) / 20);
}

const THROW_DISTANCE = 45;
const THROW_SPEED = 0.11;

/** Whether a swipe let go `offset` px away after `elapsedMs` throws the toast out. */
export function isThrown(axis: Axis, offset: number, elapsedMs: number): boolean {
  if (axis === 'y' && offset <= 0) return false;
  const distance = Math.abs(offset);
  return distance >= THROW_DISTANCE || distance / Math.max(elapsedMs, 1) > THROW_SPEED;
}

/** The time left until a date, as a clock reads it: `0:59`, `12:05`, `1:02:03`. */
export function countdown(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}
