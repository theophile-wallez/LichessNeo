import {
  centerInScroller,
  closestTo,
  createElement,
  queryAll,
  queryOne,
  setData,
} from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The right-hand panel's tabs (styles/panel-tabs.css): from 1020px the moves, the chat and,
// on the game page, the game info where there is no chat, on a study its info, share one
// area of the panel, so none of them takes a height of its own. Lichess's own chat tabs (Chat room, Notes) join
// ours and a click on one is passed to it: Lichess keeps which of them is open, we keep
// which part the panel shows.

const BAR = 'ln-ext-panel-tabs';
const TAB = `${BAR}__tab`;

/** The parts the panel can show. */
type Part = 'moves' | 'chat' | 'meta';

/** A part of ours, as against the chat's, whose tabs Lichess draws. */
interface PartSpec {
  readonly part: Part;
  /** The name of the extension's message for its tab. */
  readonly message: string;
  /** Where the part is in the page. */
  readonly selector: string;
}

interface Host {
  readonly page: string;
  /** The chat that shares the panel's area. */
  readonly chat: string;
  /** The message naming the part the panel opens on. */
  readonly moves: string;
  /** Its move on the board, scrolled back into view as the moves come on show again. */
  readonly activeMove?: string;
  /** Parts offered in the chat's place where the page has none. */
  readonly instead: readonly PartSpec[];
  /** Parts offered after the chat, where the page has them. */
  readonly after: readonly PartSpec[];
}

const HOSTS: readonly Host[] = [
  {
    page: 'main.round',
    chat: '.round__side > .mchat',
    moves: 'roundPanelMoves',
    activeMove: ':is(i5d, rm6) :is(Z7yx, kwdb):is(.a1t, .active)',
    instead: [{ part: 'meta', message: 'roundPanelGame', selector: '.round__side > .game__meta' }],
    after: [],
  },
  // The analysis page's move list keeps its own scroll (content/analysis/active-move.ts),
  // which follows it back into view as the list is resized. A study's chat is in its side
  // column (in its chapters' box from 1260px), which styles/study-page/layout.css
  // spreads over the page's grid; its info is what Lichess draws under the board.
  {
    page: 'main.analyse',
    chat: ':is(:scope > .mchat, :scope > .analyse__side .mchat)',
    moves: 'roundPanelMoves',
    instead: [],
    after: [
      {
        part: 'meta',
        message: 'studyPanelInfo',
        // Sharing takes the metadata's place, and a gamebook has no buttons.
        selector: ':scope > .analyse__underboard > :is(.study__metadata, .study__buttons)',
      },
    ],
  },
];

interface TabSpec {
  /** Lichess's key for one of its chat tabs (`discussion`, `note`), else the part's name. */
  readonly key: string;
  readonly part: Part;
  readonly label: string;
}

/** The part the user picked, for as long as the page lives; the moves to begin with. */
let shown: Part = 'moves';
/** How many chat lines there were when the chat was last on show; null until it is drawn. */
let seenLines: number | null = null;

const isPart = (value: string | undefined): value is Part =>
  value === 'moves' || value === 'chat' || value === 'meta';

// A chat tab is `button.mchat__tab.<key>` (lila's ui/lib/src/chat/renderChat.ts).
const chatKey = (tab: HTMLElement): string =>
  [...tab.classList].find(name => !name.startsWith('mchat__tab')) ?? 'discussion';

function chatTabs(host: Host, page: HTMLElement): TabSpec[] {
  return queryAll(page, `${host.chat} .mchat__tab`, HTMLElement).map(tab => ({
    key: chatKey(tab),
    part: 'chat',
    // The name is in a span of its own, beside the switch an optional chat's tab holds.
    label: queryOne(tab, ':scope > span', HTMLElement)?.textContent.trim() ?? '',
  }));
}

// The Game Review takes the panel over in its summary and move-by-move states, where it
// hides Lichess's chat and controls (styles/review/layout.css): the moves are all there is.
const REVIEW_STATES = ['ln-ext-review-summary', 'ln-ext-review-moves'];
const reviewOwnsPanel = (): boolean =>
  REVIEW_STATES.some(state => document.documentElement.classList.contains(state));

const presentTabs = (page: HTMLElement, specs: readonly PartSpec[]): TabSpec[] =>
  specs
    .filter(spec => page.querySelector(spec.selector))
    .map(spec => ({ key: spec.part, part: spec.part, label: message(spec.message) }));

/**
 * The bar's tabs: the moves, then the chat's own, or what stands in for a chat there is none
 * of, then the page's other parts.
 */
function tabsFor(host: Host, page: HTMLElement): TabSpec[] {
  const moves: TabSpec = { key: 'moves', part: 'moves', label: message(host.moves) };
  if (reviewOwnsPanel()) return [moves];
  const chat = chatTabs(host, page);
  const instead = chat.length > 0 ? chat : presentTabs(page, host.instead);
  return [moves, ...instead, ...presentTabs(page, host.after)];
}

const tabButton = (spec: TabSpec): HTMLButtonElement =>
  createElement('button', {
    className: TAB,
    text: spec.label,
    attrs: {
      type: 'button',
      role: 'tab',
      'data-ln-ext-tab': spec.key,
      'data-ln-ext-part': spec.part,
    },
  });

/** Draws the tabs again only when they or their names changed. */
function drawTabs(bar: HTMLElement, specs: readonly TabSpec[]): void {
  const signature = specs.map(spec => `${spec.key}:${spec.label}`).join('|');
  if (bar.dataset['lnExtPanels'] === signature) return;
  setData(bar, 'lnExtPanels', signature);
  bar.replaceChildren(...specs.map(tabButton));
}

function buildBar(): HTMLElement {
  const root = createElement('div', { className: BAR });
  const bar = createElement('div', { className: `${BAR}__bar`, attrs: { role: 'tablist' } });
  bar.addEventListener('click', onBarClick);
  root.append(bar);
  return root;
}

const ownBar = createOwnedElement(buildBar);

/** The tab that stands for what the panel shows: the chat's own open tab, or the part itself. */
function activeKey(host: Host, page: HTMLElement): string {
  if (shown !== 'chat') return shown;
  const open = queryOne(page, `${host.chat} .mchat__tab-active`, HTMLElement);
  return open ? chatKey(open) : 'discussion';
}

function markActive(host: Host, bar: HTMLElement, page: HTMLElement): void {
  const active = activeKey(host, page);
  for (const tab of queryAll(bar, `.${TAB}`, HTMLElement))
    tab.classList.toggle('active', tab.dataset['lnExtTab'] === active);
}

/** A dot on the chat's tab for a line that came in while another part was on show. */
function markUnread(host: Host, bar: HTMLElement, page: HTMLElement): void {
  const list = queryOne(page, `${host.chat} .mchat__messages`, HTMLElement);
  if (!list) return;
  const lines = list.querySelectorAll(':scope > li').length;
  // The lines a spectator room already holds when it is drawn aren't unread. Lichess drops
  // the oldest lines of a long chat, and a new game starts with none.
  if (shown === 'chat' || seenLines === null || lines < seenLines) seenLines = lines;
  const tab = queryOne(bar, `.${TAB}[data-ln-ext-tab='discussion']`, HTMLElement);
  if (tab) setData(tab, 'lnExtUnread', lines > seenLines ? '' : null);
}

// The panel's parts keep their scroll only while they show.
function scrollIntoPlace(host: Host, page: HTMLElement, part: Part): void {
  if (part === 'moves') {
    const move = host.activeMove ? queryOne(page, host.activeMove, HTMLElement) : null;
    if (move) centerInScroller(move);
    return;
  }
  const messages = queryOne(page, `${host.chat} .mchat__messages`, HTMLElement);
  if (messages) messages.scrollTop = messages.scrollHeight;
}

/** Passes a chat tab's pick on to Lichess, which draws that pane and remembers it. */
function openChatTab(host: Host, page: HTMLElement, key: string): void {
  const tabs = queryAll(page, `${host.chat} .mchat__tab`, HTMLElement);
  const tab = tabs.find(one => chatKey(one) === key);
  if (tab && !tab.classList.contains('mchat__tab-active')) tab.click();
}

function onBarClick(event: MouseEvent): void {
  const button = closestTo(event.target, `.${TAB}`, HTMLElement);
  const found = findHost();
  const picked = button?.dataset['lnExtPart'];
  if (!found || !button || !isPart(picked)) return;
  shown = picked;
  if (picked === 'chat') openChatTab(found.host, found.page, button.dataset['lnExtTab'] ?? '');
  syncPanelTabs();
  scrollIntoPlace(found.host, found.page, picked);
}

/** Shows one of the panel's parts, as its tab would. */
export function showPanelPart(part: Part): void {
  shown = part;
  syncPanelTabs();
}

function findHost(): { readonly host: Host; readonly page: HTMLElement } | null {
  for (const host of HOSTS) {
    const page = queryOne(document, host.page, HTMLElement);
    if (page) return { host, page };
  }
  return null;
}

export function syncPanelTabs(): void {
  const found = findHost();
  if (!found) return;
  const { host, page } = found;
  const bar = queryOne(ownBar(page).element, `.${BAR}__bar`, HTMLElement);
  if (!bar) return;
  const specs = tabsFor(host, page);
  drawTabs(bar, specs);
  // The chat comes and goes (a new game, a game against the computer, the review opening).
  if (!specs.some(spec => spec.part === shown)) shown = 'moves';
  setData(page, 'lnExtPanel', shown);
  setData(page, 'lnExtTabbed', specs.length > 1 ? '' : null);
  // An anonymous visitor's chat has one tab, which holds the switch that turns it off:
  // Lichess's own bar stays, inside the chat, so the switch is still there.
  setData(
    page,
    'lnExtChatToggle',
    page.querySelector(`${host.chat} .mchat__tab input`) ? '' : null,
  );
  markActive(host, bar, page);
  markUnread(host, bar, page);
}

// The review's state is on <html>'s class: the bar follows it at once rather than a tick
// later, or Lichess's panel showed without its tabs' row for a moment, then moved down.
export function followReviewState(): MutationObserver {
  const observer = new MutationObserver(syncPanelTabs);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return observer;
}

export const panelTabs: Feature = {
  name: 'panel tabs',
  start: () => {
    followReviewState();
    onEveryTick('panel tabs', syncPanelTabs);
  },
};
