// The card's accuracy counting up to its figure as it shows, and gliding from
// one figure to the next when the review's own replaces the quick look's.

const COUNT_MS = 900;

/** The figure `progress` (0 to 1) of the way from `from` to `to`, slowing at the end. */
const countAt = (from: number, to: number, progress: number): number =>
  from + (to - from) * (1 - (1 - Math.min(1, Math.max(0, progress))) ** 3);

const counting = new WeakMap<Element, number>();

/** Counts `element`'s text from `from` to `to`, each figure written by `format`. */
export function countUp(
  element: HTMLElement,
  range: { readonly from: number; readonly to: number },
  format: (figure: number) => string,
): void {
  cancelAnimationFrame(counting.get(element) ?? 0);
  const start = performance.now();
  const frame = (now: number): void => {
    const progress = (now - start) / COUNT_MS;
    element.textContent = format(countAt(range.from, range.to, progress));
    if (progress < 1 && element.isConnected) counting.set(element, requestAnimationFrame(frame));
  };
  counting.set(element, requestAnimationFrame(frame));
}
