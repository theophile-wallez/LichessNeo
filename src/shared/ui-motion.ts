import { animate, frame } from 'motion';

// The interface's small motions, run by Motion (motion.dev): a text that
// changes rolls the way it went, a part that comes grows from
// nothing, one that takes another's place fades in over it. Springs carry no
// bounce; what leaves goes sooner than what comes.

export const SPRING = { type: 'spring', duration: 0.3, bounce: 0 } as const;
/** For what travels: a dot along a curve, a curve changing shape. */
export const SPRING_TRAVEL = { type: 'spring', duration: 0.4, bounce: 0 } as const;
const EXIT = { duration: 0.15, ease: 'easeOut' } as const;
const SWAP_OUT = { duration: 0.09, ease: 'easeOut' } as const;

const swapping = new WeakMap<HTMLElement, object>();
const running = new WeakMap<HTMLElement, { stop: () => void }>();

type Keyframes = Parameters<typeof animate>[1];

/** Animates `element`, stopping what it ran before: a part that leaves, shown again, stays. */
function play(element: HTMLElement, keyframes: Keyframes, options: object): Promise<unknown> {
  running.get(element)?.stop();
  const controls = animate(element, keyframes, options);
  running.set(element, controls);
  return controls.finished;
}

const REST = { opacity: 1, scale: 1, y: 0 };

/**
 * Stops `element`'s motion and puts it at rest, for a change shown at once. Through Motion,
 * which writes a stopped motion's last values a frame later: a style cleared now came back.
 */
function settle(element: HTMLElement): void {
  if (!running.has(element)) return;
  running.get(element)?.stop();
  running.delete(element);
  void animate(element, REST, { duration: 0 });
  frame.postRender(() => element.style.removeProperty('height'));
}

export interface SwapOptions {
  /** Straight away: what's dragged follows the finger. */
  readonly instant?: boolean;
  /** 1 when the value went up, which comes in from below; -1 when it went down. */
  readonly direction?: number;
  /** How far it slides, in px. */
  readonly distance?: number;
}

/** Sets an element's text, sliding the old one out and the new one in. */
export function swapText(element: HTMLElement, text: string, options: SwapOptions = {}): void {
  if (element.textContent === text) return;
  const { instant = false, direction = 1, distance = 4 } = options;
  if (instant || !element.isConnected) {
    swapping.delete(element);
    settle(element);
    element.textContent = text;
    return;
  }
  void slideText(element, text, distance * direction);
}

async function slideText(element: HTMLElement, text: string, offset: number): Promise<void> {
  const token = {};
  swapping.set(element, token);
  await play(element, { opacity: 0, y: -offset }, SWAP_OUT);
  if (swapping.get(element) !== token) return;
  element.textContent = text;
  const back = { opacity: [0, 1], y: [offset, 0] };
  await play(element, back, SPRING);
}

/** How a part comes and goes: growing to its height, or fading in place over another. */
export type RevealKind = 'height' | 'fade';

const leaving = new WeakSet<HTMLElement>();

const shown = (element: HTMLElement): boolean => !element.hidden && !leaving.has(element);

/** Shows or hides a part, animated unless `instant`. */
export function reveal(
  element: HTMLElement,
  show: boolean,
  kind: RevealKind,
  instant = false,
): void {
  if (show === shown(element)) return;
  if (instant) {
    leaving.delete(element);
    settle(element);
    element.hidden = !show;
    return;
  }
  if (show) {
    leaving.delete(element);
    element.hidden = false;
    if (kind === 'height') void grow(element);
    else void play(element, { opacity: [0, 1], scale: [0.97, 1] }, SPRING);
    return;
  }
  void leave(element, kind);
}

async function grow(element: HTMLElement): Promise<void> {
  await play(element, { height: [0, element.scrollHeight], opacity: [0, 1] }, SPRING);
  if (shown(element)) element.style.height = '';
}

async function leave(element: HTMLElement, kind: RevealKind): Promise<void> {
  leaving.add(element);
  const away =
    kind === 'height'
      ? { height: [element.offsetHeight, 0], opacity: 0 }
      : { opacity: 0, scale: 0.99 };
  await play(element, away, EXIT);
  // Shown again meanwhile.
  if (!leaving.has(element)) return;
  leaving.delete(element);
  element.hidden = true;
  element.style.height = '';
}

/** Opens a popup from its trigger's side, or closes it, sooner. */
export function togglePopup(popup: HTMLElement, open: boolean): void {
  if (open) {
    leaving.delete(popup);
    popup.hidden = false;
    void play(
      popup,
      { opacity: [0, 1], scale: [0.97, 1], y: [-8, 0] },
      { type: 'spring', duration: 0.25, bounce: 0 },
    );
    return;
  }
  if (popup.hidden) return;
  void closePopup(popup);
}

async function closePopup(popup: HTMLElement): Promise<void> {
  leaving.add(popup);
  await play(popup, { opacity: 0, scale: 0.99, y: -4 }, EXIT);
  if (!leaving.has(popup)) return;
  leaving.delete(popup);
  popup.hidden = true;
}

/** Whether a popup is open, or opening. */
export const isOpen = (popup: HTMLElement): boolean => shown(popup);
