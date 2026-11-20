import { defaultsOf } from './defaults.ts';
import { LEFT_OUT, VOID_TAGS } from './properties.ts';
import { pseudoStyle, type StyleContext, writtenStyle, xmlText } from './styles.ts';

// The board's tree written out as XHTML with its computed styles inline
// (after distortion-waves' capture, MIT), for an SVG image to draw. A canvas
// (a backlit board's light) goes in as the frame it shows.

const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';
const NAME = /^[A-Za-z_][\w.-]*$/;
const SVG_ATTRIBUTE = /^(?:(?:xlink|xml):)?[A-Za-z_][\w.-]*$/;

export interface Walk {
  readonly root: Element;
  readonly context: StyleContext;
  /** Declarations written over the root's own. */
  readonly rootStyle: string;
  readonly out: string[];
  /** The rules of the pseudo-elements, which only a class can style. */
  readonly rules: string[];
  classes: number;
}

function pseudoClasses(element: Element, inherited: readonly string[], walk: Walk): string {
  const names: string[] = [];
  for (const which of ['::before', '::after'] as const) {
    const css = pseudoStyle(getComputedStyle(element, which), inherited, walk.context);
    if (css === null) continue;
    const name = `ln-ext-wave-${walk.classes++}`;
    walk.rules.push(`.${name}${which}{${css}}`);
    names.push(name);
  }
  return names.join(' ');
}

function svgAttributes(element: Element, walk: Walk): string {
  let attributes = '';
  for (const { name, value } of element.attributes) {
    if (['style', 'class', 'xmlns'].includes(name) || name.startsWith('on')) continue;
    if (name.startsWith('xmlns:') || !SVG_ATTRIBUTE.test(name)) continue;
    let written = value;
    if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#')) {
      const data = walk.context.embeds.dataOf(new URL(value, document.baseURI).href);
      if (!data) continue;
      written = data;
    }
    attributes += ` ${name}="${xmlText(written)}"`;
  }
  return attributes;
}

/** What stands in for an image or a canvas: an `img` of what it shows. */
function imageSource(element: Element, walk: Walk): string | null {
  if (element instanceof HTMLImageElement) {
    const source = element.currentSrc || element.src;
    return source ? walk.context.embeds.dataOf(source) : null;
  }
  if (!(element instanceof HTMLCanvasElement) || !element.width || !element.height) return null;
  try {
    return element.toDataURL();
  } catch {
    return null;
  }
}

interface Opened {
  readonly tag: string;
  readonly svg: boolean;
  readonly attributes: string;
}

function openTag(element: Element, walk: Walk): Opened | null {
  const namespace = element.namespaceURI;
  const svg = namespace === SVG_NS;
  if (!svg && namespace !== XHTML_NS) return null;
  const name = element.localName;
  if (!NAME.test(name) || (!svg && LEFT_OUT.has(name))) return null;
  if (svg) return { tag: name, svg, attributes: svgAttributes(element, walk) };
  if (name !== 'img' && name !== 'canvas') return { tag: name, svg, attributes: '' };
  const source = imageSource(element, walk);
  return { tag: 'img', svg, attributes: source ? ` src="${xmlText(source)}"` : '' };
}

interface Parent {
  readonly inherited: readonly string[] | null;
  readonly namespace: string | null;
}

function writeElement(element: Element, parent: Parent, walk: Walk): void {
  if (element !== walk.root && element.classList.contains('ln-ext-board-wave')) return;
  const opened = openTag(element, walk);
  const style = getComputedStyle(element);
  if (!opened || style.getPropertyValue('display') === 'none') return;
  const { tag, svg, attributes } = opened;
  const own = defaultsOf(tag, svg) ?? walk.context.plain;
  const written = writtenStyle(style, own, {
    context: svg ? { ...walk.context, plain: own } : walk.context,
    parent: parent.inherited,
  });
  const css = written.css + (element === walk.root ? walk.rootStyle : '');
  const classes = pseudoClasses(element, written.inherited, walk);
  const namespace = svg ? SVG_NS : XHTML_NS;
  const xmlns = namespace === parent.namespace ? '' : ` xmlns="${namespace}"`;
  const classAttribute = classes ? ` class="${classes}"` : '';
  const open = `<${tag}${xmlns}${classAttribute} style="${xmlText(css)}"${attributes}`;
  if (!svg && VOID_TAGS.has(tag)) {
    walk.out.push(`${open}/>`);
    return;
  }
  walk.out.push(`${open}>`);
  if (tag !== 'img') writeChildren(element, { inherited: written.inherited, namespace }, walk);
  walk.out.push(`</${tag}>`);
}

function writeChildren(element: Element, parent: Parent, walk: Walk): void {
  for (const child of element.childNodes) {
    if (child instanceof Element) writeElement(child, parent, walk);
    else if (child instanceof Text) walk.out.push(xmlText(child.data));
  }
}

/** `walk.root` and all it holds, into `walk.out` and `walk.rules`. */
export function writeTree(walk: Walk): void {
  writeElement(walk.root, { inherited: null, namespace: XHTML_NS }, walk);
}
