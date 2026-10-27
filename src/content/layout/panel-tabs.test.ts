import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';

// The bar names its own tab from the extension's messages; the chat's come from Lichess.
const i18n = { getMessage: (name: string): string => name };

const CHAT_TABS =
  '<div class="mchat__tabs nb_2">' +
  '<button class="mchat__tab discussion mchat__tab-active" role="tab"><span>Chat room</span></button>' +
  '<button class="mchat__tab note" role="tab"><span>Notes</span></button>' +
  '</div>';

const chat = (lines: readonly string[]): string =>
  `<section class="mchat">${CHAT_TABS}<div class="mchat__content discussion"><ol class="mchat__messages">` +
  lines.map(line => `<li><t>${line}</t></li>`).join('') +
  '</ol><input class="mchat__say" /></div></section>';

const round = (side: string): string =>
  '<main class="round"><div class="round__app"><i5d><aPp>' +
  '<qZM>1</qZM><Z7yx>e4</Z7yx><Z7yx class="a1t">e5</Z7yx></aPp></i5d></div>' +
  `<div class="round__side">${side}<div class="game__meta"></div></div></main>`;

const analyse = (side: string): string =>
  '<main class="analyse"><div class="analyse__tools"><div class="analyse__moves"></div></div>' +
  `<div class="analyse__controls"></div>${side}</main>`;

/** Reloaded for each test: which part is on show outlives one sync. */
let syncPanelTabs: () => void;
let followReviewState: () => MutationObserver;

const main = (): HTMLElement | null => queryOne(document, 'main', HTMLElement);

const tabs = (): HTMLElement[] => queryAll(document, '.ln-ext-panel-tabs__tab', HTMLElement);

const labels = (): string[] => tabs().map(tab => tab.textContent.trim());

const tab = (key: string): HTMLElement | null =>
  queryOne(document, `.ln-ext-panel-tabs__tab[data-ln-ext-tab='${key}']`, HTMLElement);

const activeLabel = (): string | undefined =>
  tabs()
    .find(each => each.classList.contains('active'))
    ?.textContent.trim();

beforeEach(async () => {
  vi.stubGlobal('chrome', { i18n });
  vi.resetModules();
  ({ syncPanelTabs, followReviewState } = await import('./panel-tabs.ts'));
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.className = '';
  vi.unstubAllGlobals();
});

describe('the game panel’s tabs', () => {
  it('gives the moves, the chat and its notes one tab each, the moves on show', () => {
    document.body.innerHTML = round(chat([]));
    syncPanelTabs();
    expect(labels()).toEqual(['roundPanelMoves', 'Chat room', 'Notes']);
    expect(main()?.dataset.lnExtPanel).toBe('moves');
    expect(main()?.dataset.lnExtTabbed).toBe('');
    expect(activeLabel()).toBe('roundPanelMoves');
  });

  it('shows the game info in the chat’s place where there is no chat', () => {
    document.body.innerHTML = round('');
    syncPanelTabs();
    expect(labels()).toEqual(['roundPanelMoves', 'roundPanelGame']);
    tab('meta')?.click();
    expect(main()?.dataset.lnExtPanel).toBe('meta');
  });

  it('passes a chat tab’s pick on to Lichess’s own tab, which draws that pane', () => {
    document.body.innerHTML = round(chat([]));
    syncPanelTabs();
    const clicked: string[] = [];
    for (const lichessTab of queryAll(document, '.mchat__tab', HTMLElement))
      lichessTab.addEventListener('click', () => clicked.push(lichessTab.className));
    tab('note')?.click();
    expect(main()?.dataset.lnExtPanel).toBe('chat');
    expect(clicked).toEqual(['mchat__tab note']);
    // The tab already open isn't clicked again: Lichess would redraw for nothing.
    tab('discussion')?.click();
    expect(clicked).toEqual(['mchat__tab note']);
  });

  it('marks the chat tab Lichess has open, not the one last clicked', () => {
    document.body.innerHTML = round(chat([]));
    syncPanelTabs();
    tab('discussion')?.click();
    expect(activeLabel()).toBe('Chat room');
    // Lichess moves its own active class as it draws the pane.
    queryOne(document, '.mchat__tab.discussion', HTMLElement)?.classList.remove(
      'mchat__tab-active',
    );
    queryOne(document, '.mchat__tab.note', HTMLElement)?.classList.add('mchat__tab-active');
    syncPanelTabs();
    expect(activeLabel()).toBe('Notes');
  });

  it('dots the chat’s tab for a line that came in while another part was on show', () => {
    document.body.innerHTML = round(chat(['hello']));
    syncPanelTabs();
    // The lines the room already held when it was drawn aren't unread.
    expect(tab('discussion')?.dataset.lnExtUnread).toBeUndefined();
    queryOne(document, '.mchat__messages', HTMLElement)?.insertAdjacentHTML(
      'beforeend',
      '<li><t>good game</t></li>',
    );
    syncPanelTabs();
    expect(tab('discussion')?.dataset.lnExtUnread).toBe('');
    tab('discussion')?.click();
    expect(tab('discussion')?.dataset.lnExtUnread).toBeUndefined();
  });

  it('falls back to the moves when the part on show goes (a game against the computer)', () => {
    document.body.innerHTML = round(chat([]));
    syncPanelTabs();
    tab('discussion')?.click();
    expect(main()?.dataset.lnExtPanel).toBe('chat');
    queryOne(document, '.mchat', HTMLElement)?.remove();
    syncPanelTabs();
    expect(main()?.dataset.lnExtPanel).toBe('moves');
    expect(labels()).toEqual(['roundPanelMoves', 'roundPanelGame']);
  });

  it('keeps Lichess’s own bar only where a tab holds the switch that turns the chat off', () => {
    document.body.innerHTML = round(chat([]));
    syncPanelTabs();
    expect(main()?.dataset.lnExtChatToggle).toBeUndefined();
    queryOne(document, '.mchat__tab.discussion', HTMLElement)?.insertAdjacentHTML(
      'beforeend',
      '<input type="checkbox" />',
    );
    syncPanelTabs();
    expect(main()?.dataset.lnExtChatToggle).toBe('');
  });

  it('gives the analysis panel the same tabs, the engine and moves as one part', () => {
    document.body.innerHTML = analyse(chat([]));
    syncPanelTabs();
    expect(labels()).toEqual(['roundPanelMoves', 'Chat room', 'Notes']);
    expect(main()?.dataset.lnExtPanel).toBe('moves');
    tab('note')?.click();
    expect(main()?.dataset.lnExtPanel).toBe('chat');
  });

  // Lichess puts a study's chat in its chapters' box from 1260px, beside it below.
  it.each([
    ['in its chapters’ box', (markup: string) => `<div class="study__side">${markup}</div>`],
    ['beside it', (markup: string) => `<div class="study__side"></div>${markup}`],
  ])('gives a study’s chat a tab %s, and its info one', (_where, place) => {
    document.body.innerHTML = analyse(
      `<aside class="analyse__side">${place(chat([]))}</aside>` +
        '<div class="analyse__underboard"><div class="study__metadata"></div></div>',
    );
    syncPanelTabs();
    expect(labels()).toEqual(['roundPanelMoves', 'Chat room', 'Notes', 'studyPanelInfo']);
    tab('meta')?.click();
    expect(main()?.dataset.lnExtPanel).toBe('meta');
  });

  it('leaves the panel to the Game Review while it has it', () => {
    document.documentElement.classList.add('ln-ext-review-moves');
    document.body.innerHTML = analyse(chat([]));
    syncPanelTabs();
    expect(labels()).toEqual(['roundPanelMoves']);
    expect(main()?.dataset.lnExtTabbed).toBeUndefined();
    document.documentElement.classList.remove('ln-ext-review-moves');
    syncPanelTabs();
    expect(labels()).toEqual(['roundPanelMoves', 'Chat room', 'Notes']);
  });

  it('follows the Game Review as it takes the panel and gives it back, not a tick later', async () => {
    document.body.innerHTML = analyse(chat([]));
    syncPanelTabs();
    const observer = followReviewState();
    document.documentElement.classList.add('ln-ext-review-moves');
    await flush();
    expect(main()?.dataset.lnExtTabbed).toBeUndefined();
    document.documentElement.classList.remove('ln-ext-review-moves');
    await flush();
    expect(main()?.dataset.lnExtTabbed).toBe('');
    observer.disconnect();
  });

  it('draws the tabs again only when they change', () => {
    document.body.innerHTML = round(chat([]));
    syncPanelTabs();
    const first = tabs()[0];
    syncPanelTabs();
    // The same buttons, not fresh ones: a redraw each tick would wake every observer.
    expect(tabs()[0]).toBe(first);
    queryOne(document, '.mchat__tab.note', HTMLElement)?.remove();
    syncPanelTabs();
    expect(labels()).toEqual(['roundPanelMoves', 'Chat room']);
  });
});
