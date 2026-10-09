import { setData, setStyleProperty } from '#shared/dom.ts';
import { oncePerFrame } from '#shared/frame.ts';
import { sameOffset, tabOffset, type TabBarKind, type TabOffset } from './tab-bars.ts';

// What `place` measures (getBoundingClientRect): padding or border changes count too.
const BORDER_BOX: ResizeObserverOptions = { box: 'border-box' };

// One tab bar. Its active tab's highlight is the bar's ::before, placed in
// `--lr-ext-tab-{x,y,w,h}`; the bar is only marked once it's placed, so until
// then (and with no active tab) the tab keeps its own highlight. It's placed
// again when the bar or a child resizes, scrolls, or changes a tab.

export class TabBar {
  readonly element: HTMLElement;
  readonly kind: TabBarKind;
  /** A tab link just followed: shown picked while the next page loads. */
  leaving: Element | null = null;
  /** Places the highlight on the next frame. */
  readonly queue: () => void;
  readonly #sizes: ResizeObserver;
  readonly #changes: MutationObserver;
  readonly #onDetach: () => void;
  #item: HTMLElement | null = null;
  #offset: TabOffset | null = null;

  constructor(element: HTMLElement, kind: TabBarKind, onDetach: () => void) {
    this.element = element;
    this.kind = kind;
    this.#onDetach = onDetach;
    this.queue = oncePerFrame(() => this.place());
    this.#sizes = new ResizeObserver(this.queue);
    this.#sizes.observe(element, BORDER_BOX);
    element.addEventListener('scroll', this.queue, { passive: true });
    this.#changes = new MutationObserver(this.queue);
    this.#changes.observe(element, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  /** Stops following a bar Lichess removed; true if it did. */
  dropIfDetached(): boolean {
    if (this.element.isConnected) return false;
    this.#sizes.disconnect();
    this.#changes.disconnect();
    this.element.removeEventListener('scroll', this.queue);
    this.#onDetach();
    return true;
  }

  place(): void {
    if (this.dropIfDetached()) return;
    const children = [...this.element.children];
    // Any child: one that isn't a tab can still push the tabs along.
    for (const child of children) this.#sizes.observe(child, BORDER_BOX);
    const tabs = children.filter(child => child.matches(this.kind.tab));
    const item = this.leaving?.isConnected
      ? this.leaving
      : tabs.find(tab => tab.matches(this.kind.active));
    if (!item) {
      setData(this.element, 'lrExtTabs', null);
      this.#item = null;
      return;
    }
    // The tab is hidden: place the highlight once it shows.
    if (!(item instanceof HTMLElement) || item.offsetWidth === 0) return;
    const bar = this.element.getBoundingClientRect();
    const offset = tabOffset(bar, item.getBoundingClientRect(), this.element);
    if (item === this.#item && sameOffset(offset, this.#offset)) return;
    this.#draw(item, offset);
  }

  #draw(item: HTMLElement, offset: TabOffset): void {
    const [x, y, width, height] = offset;
    // Picking another tab slides; the same tab moved or resized jumps there.
    const slides = this.#item !== null && item !== this.#item;
    setData(this.element, 'lrExtTabsStill', slides ? null : '');
    setStyleProperty(this.element, '--lr-ext-tab-x', `${x}px`);
    setStyleProperty(this.element, '--lr-ext-tab-y', `${y}px`);
    setStyleProperty(this.element, '--lr-ext-tab-w', `${width}px`);
    setStyleProperty(this.element, '--lr-ext-tab-h', `${height}px`);
    setData(this.element, 'lrExtTabs', this.kind.look);
    this.#item = item;
    this.#offset = offset;
  }
}
