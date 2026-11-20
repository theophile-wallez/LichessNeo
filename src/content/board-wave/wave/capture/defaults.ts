import { INHERITED, isWritten } from './properties.ts';

// What the browser alone gives each kind of element, read once from a blank
// frame so the page's stylesheets don't skew it (after distortion-waves'
// capture, MIT). The picture writes only what differs from it, and from the
// parent for an inherited property: a board's picture stays small.

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface Defaults {
  /** The computed values of `PropertyNames.inherited` and `.other`, in their order. */
  readonly inherited: readonly string[];
  readonly other: readonly string[];
}

export interface PropertyNames {
  readonly inherited: readonly string[];
  readonly other: readonly string[];
}

interface Sandbox {
  readonly frame: HTMLIFrameElement;
  readonly window: Window;
  readonly hidden: Element;
  readonly svg: Element;
  readonly names: PropertyNames;
  readonly cache: Map<string, Defaults>;
}

let sandbox: Sandbox | null = null;

function namesIn(style: CSSStyleDeclaration): PropertyNames {
  const inherited: string[] = [];
  const other: string[] = [];
  for (const name of style) {
    if (!isWritten(name)) continue;
    if (INHERITED.has(name)) inherited.push(name);
    else other.push(name);
  }
  return { inherited, other };
}

// Standards mode, as the picture's XHTML gets; sizes read as written inside `display: none`.
// A `srcdoc` rather than document.write, which Firefox keeps a content script from.
const SANDBOX_PAGE = `<!doctype html><html><body><div style="display:none"><svg xmlns="${SVG_NS}"></svg></div></body></html>`;

async function openSandbox(): Promise<Sandbox | null> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.className = 'ln-ext-board-wave__sandbox';
  frame.srcdoc = SANDBOX_PAGE;
  const loaded = new Promise(resolve => {
    frame.addEventListener('load', resolve, { once: true });
  });
  document.body.append(frame);
  await loaded;
  const frameWindow = frame.contentWindow;
  const hidden = frame.contentDocument?.body.firstElementChild;
  const svg = hidden?.firstElementChild;
  if (!frameWindow || !hidden || !svg) {
    frame.remove();
    return null;
  }
  const probe = hidden.ownerDocument.createElement('div');
  hidden.append(probe);
  const names = namesIn(frameWindow.getComputedStyle(probe));
  probe.remove();
  return { frame, window: frameWindow, hidden, svg, names, cache: new Map() };
}

/** Opens the frame the defaults are read in, unless it's open; false if it can't be. */
export async function prepareSandbox(): Promise<boolean> {
  if (sandbox?.frame.isConnected) return true;
  sandbox?.frame.remove();
  sandbox = await openSandbox();
  return sandbox !== null;
}

/** The properties a picture writes, split as inherited or not; null without a sandbox. */
export const propertyNames = (): PropertyNames | null => sandbox?.names ?? null;

/** The defaults of a bare `tag` (an SVG one if `svg`), or null without a sandbox. */
export function defaultsOf(tag: string, svg: boolean): Defaults | null {
  const box = sandbox;
  if (!box) return null;
  const key = svg ? `svg:${tag}` : tag;
  const known = box.cache.get(key);
  if (known) return known;
  const frameDocument = box.hidden.ownerDocument;
  const element = svg
    ? frameDocument.createElementNS(SVG_NS, tag)
    : frameDocument.createElement(/^[a-z][\w-]*$/.test(tag) ? tag : 'span');
  (svg && tag !== 'svg' ? box.svg : box.hidden).append(element);
  const style = box.window.getComputedStyle(element);
  const defaults: Defaults = {
    inherited: box.names.inherited.map(name => style.getPropertyValue(name)),
    other: box.names.other.map(name => style.getPropertyValue(name)),
  };
  element.remove();
  box.cache.set(key, defaults);
  return defaults;
}

/** Takes the sandbox's frame out of the page, once the wave is done. */
export function closeSandbox(): void {
  sandbox?.frame.remove();
  sandbox = null;
}
