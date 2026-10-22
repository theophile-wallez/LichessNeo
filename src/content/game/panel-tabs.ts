import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The game panel's tabs (styles/game/panel-tabs.css): from 1020px the moves,
// the chat and, where there is no chat, the game info share one area of the
// panel, so none of them takes a height of its own. Lichess's own chat tabs
// (Chat room, Notes) join ours and a click on one is passed to it: Lichess
// keeps which of them is open, we keep which part the panel shows.

const BAR = 'ln-ext-panel-tabs';
const TAB = `${BAR}__tab`;

/** The parts the panel can show. */
type Part = 'moves' | 'chat' | 'meta';

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

function chatTabs(main: HTMLElement): TabSpec[] {
  return queryAll(main, '.mchat .mchat__tab', HTMLElement).map(tab => ({
    key: chatKey(tab),
    part: 'chat',
    // The name is in a span of its own, beside the switch an optional chat's tab holds.
    label: queryOne(tab, ':scope > span', HTMLElement)?.textContent.trim() ?? '',
  }));
}

/** The bar's tabs: the moves, then the chat's own, or the game info where there is no chat. */
function tabsFor(main: HTMLElement): TabSpec[] {
  const moves: TabSpec = { key: 'moves', part: 'moves', label: message('roundPanelMoves') };
  const chat = chatTabs(main);
  if (chat.length > 0) return [moves, ...chat];
  const meta = queryOne(main, '.round__side > .game__meta', HTMLElement);
  if (!meta) return [moves];
  return [moves, { key: 'meta', part: 'meta', label: message('roundPanelGame') }];
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

const barOf = (root: HTMLElement): HTMLElement | null =>
  queryOne(root, `.${BAR}__bar`, HTMLElement);

/** The tab that stands for what the panel shows: the chat's own open tab, or the part itself. */
function activeKey(main: HTMLElement): string {
  if (shown !== 'chat') return shown;
  const open = queryOne(main, '.mchat .mchat__tab-active', HTMLElement);
  return open ? chatKey(open) : 'discussion';
}

function markActive(bar: HTMLElement, main: HTMLElement): void {
  const active = activeKey(main);
  for (const tab of queryAll(bar, `.${TAB}`, HTMLElement))
    tab.classList.toggle('active', tab.dataset['lnExtTab'] === active);
}

/** A dot on the chat's tab for a line that came in while another part was on show. */
function markUnread(bar: HTMLElement, main: HTMLElement): void {
  const list = queryOne(main, '.mchat__messages', HTMLElement);
  if (!list) return;
  const lines = list.querySelectorAll(':scope > li').length;
  // The lines a spectator room already holds when it is drawn aren't unread. Lichess drops
  // the oldest lines of a long chat, and a new game starts with none.
  if (shown === 'chat' || seenLines === null || lines < seenLines) seenLines = lines;
  const tab = queryOne(bar, `.${TAB}[data-ln-ext-tab='discussion']`, HTMLElement);
  if (tab) setData(tab, 'lnExtUnread', lines > seenLines ? '' : null);
}

// The panel's parts keep their scroll only while they show.
function scrollIntoPlace(main: HTMLElement, part: Part): void {
  if (part === 'moves') {
    const move = queryOne(main, ':is(i5d, rm6) :is(Z7yx, kwdb):is(.a1t, .active)', HTMLElement);
    move?.scrollIntoView({ block: 'center' });
    return;
  }
  const messages = queryOne(main, '.mchat__messages', HTMLElement);
  if (messages) messages.scrollTop = messages.scrollHeight;
}

/** Passes a chat tab's pick on to Lichess, which draws that pane and remembers it. */
function openChatTab(main: HTMLElement, key: string): void {
  const tabs = queryAll(main, '.mchat .mchat__tab', HTMLElement);
  const tab = tabs.find(one => chatKey(one) === key);
  if (tab && !tab.classList.contains('mchat__tab-active')) tab.click();
}

function onBarClick(event: MouseEvent): void {
  const button = closestTo(event.target, `.${TAB}`, HTMLElement);
  const main = closestTo(button, 'main.round', HTMLElement);
  const picked = button?.dataset['lnExtPart'];
  if (!main || !button || !isPart(picked)) return;
  shown = picked;
  if (picked === 'chat') openChatTab(main, button.dataset['lnExtTab'] ?? '');
  syncPanelTabs();
  scrollIntoPlace(main, picked);
}

export function syncPanelTabs(): void {
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) return;
  const bar = barOf(ownBar(main).element);
  if (!bar) return;
  const specs = tabsFor(main);
  drawTabs(bar, specs);
  // The chat comes and goes (a new game, a game against the computer).
  if (!specs.some(spec => spec.part === shown)) shown = 'moves';
  setData(main, 'lnExtPanel', shown);
  setData(main, 'lnExtTabbed', specs.length > 1 ? '' : null);
  // An anonymous visitor's chat has one tab, which holds the switch that turns it off:
  // Lichess's own bar stays, inside the chat, so the switch is still there.
  setData(main, 'lnExtChatToggle', main.querySelector('.mchat__tab input') ? '' : null);
  markActive(bar, main);
  markUnread(bar, main);
}

export const panelTabs: Feature = {
  name: 'panel tabs',
  start: () => onEveryTick('panel tabs', syncPanelTabs),
};
