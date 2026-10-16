import { closestTo, setData, setStyleProperty } from '#shared/dom.ts';
import { isThrown, swipeOffset, type Axis } from './stack.ts';

// A toast follows the finger or the mouse that drags it, then is thrown out, or springs back.

/** How far the pointer moves before the swipe picks its axis. */
const AXIS_LOCK = 4;

function lockAxis(dx: number, dy: number): Axis | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}

export function makeSwipeable(toast: HTMLElement, onThrown: () => void): void {
  toast.addEventListener('pointerdown', down => {
    if (down.button !== 0 || closestTo(down.target, 'button, a', Element)) return;
    toast.setPointerCapture(down.pointerId);
    let axis: Axis | null = null;
    let offset = 0;
    const move = (event: PointerEvent): void => {
      const dx = event.clientX - down.clientX;
      const dy = event.clientY - down.clientY;
      axis ??= lockAxis(dx, dy);
      if (!axis) return;
      setData(toast, 'lrExtSwiping', '');
      offset = swipeOffset(axis, axis === 'x' ? dx : dy);
      setStyleProperty(toast, `--lr-ext-swipe-${axis}`, `${offset}px`);
    };
    const end = (event: PointerEvent): void => {
      toast.removeEventListener('pointermove', move);
      toast.removeEventListener('pointerup', end);
      toast.removeEventListener('pointercancel', end);
      setData(toast, 'lrExtSwiping', null);
      if (!axis) return;
      if (event.type === 'pointerup' && isThrown(axis, offset, event.timeStamp - down.timeStamp)) {
        // On out of the window, the way it went: its own size further.
        const out = offset < 0 ? '-100%' : '100%';
        setStyleProperty(toast, `--lr-ext-swipe-${axis}`, `calc(${offset}px + ${out})`);
        onThrown();
      } else {
        setStyleProperty(toast, `--lr-ext-swipe-${axis}`, null);
      }
    };
    toast.addEventListener('pointermove', move);
    toast.addEventListener('pointerup', end);
    toast.addEventListener('pointercancel', end);
  });
}
