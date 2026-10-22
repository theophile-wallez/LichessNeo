// Measures only after a size change. A tick finds the elements (lookups, no
// layout) and hands them over; the measure runs at once when they're new, and
// from a ResizeObserver when one of them resizes. The observer runs before the
// frame is drawn, so a row that grows between two ticks is sized in the frame
// it grew in, rather than up to 250 ms later: the page used to show the game
// over's card in a row still the old height, then snap into place a tick after.

export interface SizeWatch {
  /** Watches `elements`, measuring now if they're new and on every later resize. */
  readonly watch: (elements: readonly Element[]) => void;
}

const sameElements = (elements: readonly Element[], others: readonly Element[]): boolean =>
  elements.length === others.length && elements.every((element, i) => element === others[i]);

/**
 * A watch that calls `measure` when the elements it's handed are new or
 * resized. `measure` must write only what changed (`setStyleProperty`), so a
 * write that resizes nothing ends the observer's round.
 */
export function createSizeWatch(measure: () => void): SizeWatch {
  let watched: readonly Element[] = [];
  const observer = new ResizeObserver(measure);
  return {
    watch: elements => {
      if (sameElements(elements, watched)) return;
      observer.disconnect();
      // The border box: what the tasks measure (getBoundingClientRect).
      for (const element of elements) observer.observe(element, { box: 'border-box' });
      watched = elements;
      measure();
    },
  };
}
