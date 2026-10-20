import { queryAll } from '#shared/dom.ts';

const settled = new WeakSet<HTMLSelectElement>();

/**
 * Picks the `selected` option of each menu under `root` not seen before, as a browser parsing
 * it does: happy-dom 21 picks the second option for any `selected` one past it.
 */
export function pickSelectedOptions(root: ParentNode): void {
  for (const select of queryAll(root, 'select', HTMLSelectElement)) {
    if (settled.has(select)) continue;
    settled.add(select);
    const marked = queryAll(select, 'option[selected]', HTMLOptionElement).at(-1);
    if (marked) select.value = marked.value;
  }
}
