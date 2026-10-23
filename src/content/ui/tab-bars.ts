import type { Box } from '#shared/geometry.ts';

// The tab bars whose highlight slides (styles/theme/tooltips-and-tabs.css).
// The first match wins, and the tabs are the bar's children. A bar Lichess
// draws anew on a click has nothing to slide, so it isn't listed: the
// profile's games filter (it comes back with the games), the home lobby's
// tabs and the explorer's databases.

/** The highlight's look: a raised pill or an underline. */
type TabLook = 'pill' | 'line';

export interface TabBarKind {
  readonly bar: string;
  readonly tab: string;
  readonly active: string;
  readonly look: TabLook;
}

const kind = (bar: string, tab: string, active: string, look: TabLook): TabBarKind => ({
  bar,
  tab,
  active,
  look,
});

export const TAB_BARS: readonly TabBarKind[] = [
  kind('.user-show > .angles', '.nm-item', '.active', 'pill'),
  kind('.game-setup .time-control-tabs .tabs-horiz', 'button', '.active', 'pill'),
  kind('.ublog-index .btn-rack', '.btn-rack__btn', '.active', 'pill'),
  kind('main.forum-topic .markdown-editor .header', '.header-tab', '.active', 'pill'),
  kind('.mchat__tabs', '.mchat__tab', '.mchat__tab-active', 'pill'),
  kind('.ln-ext-panel-tabs__bar', '.ln-ext-panel-tabs__tab', '.active', 'pill'),
  kind('.tabs-horiz:not(.lobby__app > .tabs-horiz)', '*', '.active', 'line'),
  kind('.analyse__underboard__menu', 'button', '.active', 'line'),
  kind('.auth .auth-tabs', 'a', '.active', 'line'),
  kind('.relay-tour__tabs', 'button', '.active', 'pill'),
  kind(
    'main.opening .opening__panels > .tab-list',
    '.tab-list__tab',
    "[aria-selected='true']",
    'pill',
  ),
  // The questions' panels, and on a phone the three views Lichess shows one of.
  kind('main#insight :is(.panel-tabs, .view-tabs)', '.tab', '.active', 'line'),
  kind('#dasher_app .ln-ext-src-tabs', 'button', '.active', 'pill'),
  kind('#dasher_app .ln-ext-src-options', 'button', '.active', 'pill'),
  kind('.ln-ext-looks .ln-ext-src-options', 'button', '.active', 'pill'),
  kind('.ln-ext-avatar-pick__modes', 'button', '.active', 'pill'),
  kind('#ln-ext-review .ln-ext-graph-views', 'button', '.active', 'pill'),
  // The practice page's choices (page/review/view/openings-kept.ts).
  kind('#ln-ext-review .ln-ext-seg', 'button', '.active', 'pill'),
  // Lichess's radio groups (preferences, coordinate trainer): each option a div with its radio.
  // The game setup's and the patron page's keep a look of their own; the openings' filters
  // are checkboxes, several picked at once.
  kind(
    'group.radio:not(.game-setup group.radio, main.plan group.radio, .opening__config group.radio)',
    'div',
    ':has(> input:checked)',
    'pill',
  ),
];

/** Where a bar's highlight goes: x, y, width, height, in px. */
export type TabOffset = readonly [number, number, number, number];

/** The part of an element's box model the offset depends on. */
export interface ScrollFrame {
  readonly clientLeft: number;
  readonly clientTop: number;
  readonly scrollLeft: number;
  readonly scrollTop: number;
}

/** The tab's box within the bar's padding box, scrolled content included. */
export function tabOffset(bar: Box, tab: Box, frame: ScrollFrame): TabOffset {
  return [
    tab.left - bar.left - frame.clientLeft + frame.scrollLeft,
    tab.top - bar.top - frame.clientTop + frame.scrollTop,
    tab.width,
    tab.height,
  ];
}

export const sameOffset = (offset: TabOffset, previous: TabOffset | null): boolean =>
  previous !== null && offset.every((value, i) => value === previous[i]);

/** A click on a tab link that the browser will follow: the page is about to go. */
export function leavesPage(event: MouseEvent, tab: Element): boolean {
  const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
  const newTab = tab instanceof HTMLAnchorElement && tab.target === '_blank';
  return (
    tab.matches('a[href]') && !event.defaultPrevented && event.button === 0 && !modified && !newTab
  );
}
