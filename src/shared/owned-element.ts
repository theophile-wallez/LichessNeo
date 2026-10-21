export interface OwnedElement<T extends Element> {
  readonly element: T;
  /** True when the element was just built, so whatever was drawn into the last one is gone. */
  readonly isNew: boolean;
}

/**
 * Keeps one element of ours at the end of a Lichess container, built again
 * when Lichess replaces the container (a new page, a redrawn board) or when
 * asked for another one, which takes it from the last.
 */
export function createOwnedElement<T extends Element>(
  build: () => T,
): (parent: Element) => OwnedElement<T> {
  let current: T | null = null;
  return parent => {
    if (current?.parentNode === parent) return { element: current, isNew: false };
    current?.remove();
    current = build();
    parent.append(current);
    return { element: current, isNew: true };
  };
}
