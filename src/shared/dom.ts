// Typed DOM helpers. They narrow with `instanceof` rather than trusting a
// selector, so nothing downstream needs a type assertion.

type Constructor<T> = abstract new (...args: never[]) => T;

export const isParsing = (): boolean => document.readyState === 'loading';

/** Runs `callback` once the document is parsed, or right away if it already is. */
export function onDomReady(callback: () => void): void {
  if (isParsing()) document.addEventListener('DOMContentLoaded', callback, { once: true });
  else callback();
}

/**
 * Runs `callback` once <head> is parsed (as <body> begins), or right away if it is. Before the
 * first paint, unlike `onDomReady`.
 */
export function onHeadParsed(callback: () => void): void {
  if (document.body) return callback();
  const observer = new MutationObserver(() => {
    if (!document.body) return;
    observer.disconnect();
    callback();
  });
  observer.observe(document.documentElement, { childList: true });
}

export function queryOne<T extends Element>(
  root: ParentNode,
  selector: string,
  type: Constructor<T>,
): T | null {
  const element = root.querySelector(selector);
  return element instanceof type ? element : null;
}

export function queryAll<T extends Element>(
  root: ParentNode,
  selector: string,
  type: Constructor<T>,
): T[] {
  return [...root.querySelectorAll(selector)].filter(
    (element): element is T => element instanceof type,
  );
}

export function closestTo<T extends Element>(
  target: EventTarget | null,
  selector: string,
  type: Constructor<T>,
): T | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest(selector);
  return element instanceof type ? element : null;
}

interface ElementOptions {
  readonly className?: string;
  readonly id?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
}

/** Sets the class, the id, the text, then the attributes, in that order. */
export function applyOptions<T extends HTMLElement>(element: T, options: ElementOptions = {}): T {
  if (options.className !== undefined) element.className = options.className;
  if (options.id !== undefined) element.id = options.id;
  if (options.text !== undefined) element.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {}))
    element.setAttribute(name, value);
  return element;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: ElementOptions,
): HTMLElementTagNameMap[K] {
  return applyOptions(document.createElement(tag), options);
}

/** An element lib.dom has no type for, such as Lichess's `rating` or chessground's `piece`. */
export function createCustomElement(tag: string, options?: ElementOptions): HTMLElement {
  return applyOptions(document.createElement(tag), options);
}

/**
 * Sets a `data-*` attribute only when it changes, and removes it for `null`.
 * Writing an unchanged value still counts as a mutation, which wakes every
 * observer on the page.
 */
export function setData(
  element: HTMLElement | SVGElement,
  key: string,
  value: string | null,
): void {
  const { dataset } = element;
  if (value === null) {
    if (key in dataset) delete dataset[key];
  } else if (dataset[key] !== value) {
    dataset[key] = value;
  }
}

/**
 * Sets a data attribute that reads as empty when absent: an empty value
 * clears one already there, but doesn't add it.
 */
export function setDataText(element: HTMLElement | SVGElement, key: string, value: string): void {
  if ((element.dataset[key] ?? '') !== value) element.dataset[key] = value;
}

/** Sets an inline style property (a custom one, or any other) only when it changes. */
export function setStyleProperty(
  element: HTMLElement | SVGElement,
  name: string,
  value: string | null,
): void {
  const current = element.style.getPropertyValue(name);
  if (value === null) {
    if (current !== '') element.style.removeProperty(name);
  } else if (current !== value) {
    element.style.setProperty(name, value);
  }
}

const scrolls = (box: HTMLElement): boolean =>
  box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY);

/**
 * Centers `element` in the nearest ancestor that scrolls it, and in that one
 * only: `scrollIntoView` scrolls every ancestor, a page held still by
 * `overflow: hidden` too.
 */
export function centerInScroller(element: HTMLElement): void {
  let scroller = element.parentElement;
  while (scroller && !scrolls(scroller)) scroller = scroller.parentElement;
  if (!scroller) return;
  const box = scroller.getBoundingClientRect();
  const target = element.getBoundingClientRect();
  scroller.scrollTop += target.top - box.top - (scroller.clientHeight - target.height) / 2;
}
