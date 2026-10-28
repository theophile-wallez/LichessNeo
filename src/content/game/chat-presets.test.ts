import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { showPanelPart } from '#content/layout/panel-tabs.ts';
import { syncChatPresets } from './chat-presets.ts';

const settings = vi.hoisted(() => ({
  chatReplies: { start: ['Salut', 'Bonne chance'], end: ['Bien joué', 'Merci', 'À plus'] },
}));

vi.mock('#content/settings/settings.ts', () => ({ currentSettings: () => settings }));

vi.mock('#content/layout/panel-tabs.ts', () => ({
  showPanelPart: vi.fn<(part: string) => void>(),
}));

// lila's ui/lib/src/chat/preset.ts: a group's keys as the text, their words as the title.
const START_PRESETS =
  '<div class="mchat__presets"><span title="Hello">hi</span><span title="Good luck">gl</span></div>';
const END_PRESETS =
  '<div class="mchat__presets"><span title="Good game">gg</span><span title="Well played">wp</span>' +
  '<span title="Thank you">ty</span></div>';

const FOLLOW_UP =
  '<div class="follow-up"><button class="fbt rematch">Rematch</button>' +
  '<a class="fbt" href="/abcd1234/analysis">Analysis board</a></div>';

const INPUT = '<input class="mchat__say" />';

const page = ({ presets = '', input = INPUT, followUp = '' }): string =>
  `<main class="round"><div class="round__side"><section class="mchat">` +
  `<div class="mchat__content discussion"><ol class="mchat__messages"></ol>${input}${presets}</div>` +
  `</section></div><div class="rcontrols">${followUp}</div></main>`;

const replies = (): string[] =>
  queryAll(document, '.ln-ext-chat-presets__reply', HTMLElement).map(reply => reply.textContent);

const reply = (text: string): HTMLElement | undefined =>
  queryAll(document, '.ln-ext-chat-presets__reply', HTMLElement).find(
    button => button.textContent === text,
  );

const lichessHidden = (): boolean =>
  queryOne(document, 'main.round', HTMLElement)?.dataset.lnExtChatPresets === '';

const chatInput = (): HTMLInputElement | null =>
  queryOne(document, 'input.mchat__say', HTMLInputElement);

// What lila reads off its input on Enter (ui/lib/src/chat/discussion.ts), before it empties it.
function sentLines(): string[] {
  const lines: string[] = [];
  chatInput()?.addEventListener('keydown', event => {
    if (!(event.target instanceof HTMLInputElement) || event.key !== 'Enter') return;
    lines.push(event.target.value);
    event.target.value = '';
  });
  return lines;
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('the quick replies at a game’s start', () => {
  it('show the user’s own in the chat, just after Lichess’s row, which they hide', () => {
    document.body.innerHTML = page({ presets: START_PRESETS });
    syncChatPresets();
    syncChatPresets();
    expect(replies()).toEqual(['Salut', 'Bonne chance']);
    const presets = queryOne(document, '.mchat__presets', HTMLElement);
    expect(presets?.nextElementSibling?.classList.contains('ln-ext-chat-presets')).toBe(true);
    expect(lichessHidden()).toBe(true);
  });

  it('send through the chat’s input, and give back the draft the player was typing', async () => {
    document.body.innerHTML = page({ presets: START_PRESETS });
    syncChatPresets();
    const sent = sentLines();
    const input = chatInput();
    if (input) input.value = 'Bonjour à';
    reply('Bonne chance')?.click();
    expect(sent).toEqual(['Bonne chance']);
    await flush();
    expect(input?.value).toBe('Bonjour à');
    expect(showPanelPart).not.toHaveBeenCalled();
  });

  it('all stay once said, where Lichess takes its own away', () => {
    document.body.innerHTML = page({ presets: START_PRESETS });
    syncChatPresets();
    sentLines();
    reply('Salut')?.click();
    reply('Bonne chance')?.click();
    syncChatPresets();
    expect(replies()).toEqual(['Salut', 'Bonne chance']);
  });

  it('go once Lichess shows none, past the first moves', () => {
    document.body.innerHTML = page({ presets: START_PRESETS });
    syncChatPresets();
    queryOne(document, '.mchat__presets', HTMLElement)?.remove();
    syncChatPresets();
    expect(document.querySelector('.ln-ext-chat-presets')).toBeNull();
    expect(queryOne(document, 'main.round', HTMLElement)?.dataset.lnExtChatPresets).toBeUndefined();
  });
});

describe('the quick replies at a game’s end', () => {
  it('stand before Lichess’s buttons, its analysis link still the last', () => {
    document.body.innerHTML = page({ presets: END_PRESETS, followUp: FOLLOW_UP });
    syncChatPresets();
    expect(replies()).toEqual(['Bien joué', 'Merci', 'À plus']);
    const followUp = queryOne(document, '.follow-up', HTMLElement);
    expect(followUp?.firstElementChild?.classList.contains('ln-ext-chat-presets')).toBe(true);
    // page/game-over/chips.ts
    expect(followUp?.lastElementChild?.getAttribute('href')).toBe('/abcd1234/analysis');
  });

  it('open the chat once one is sent', () => {
    document.body.innerHTML = page({ presets: END_PRESETS, followUp: FOLLOW_UP });
    syncChatPresets();
    const sent = sentLines();
    reply('Merci')?.click();
    expect(sent).toEqual(['Merci']);
    expect(showPanelPart).toHaveBeenCalledWith('chat');
  });

  it('follow the settings as they change', () => {
    document.body.innerHTML = page({ presets: END_PRESETS, followUp: FOLLOW_UP });
    syncChatPresets();
    const { end } = settings.chatReplies;
    settings.chatReplies.end = ['GG', 'Une autre ?'];
    syncChatPresets();
    expect(replies()).toEqual(['GG', 'Une autre ?']);
    settings.chatReplies.end = [];
    syncChatPresets();
    expect(document.querySelector('.ln-ext-chat-presets')).toBeNull();
    expect(lichessHidden()).toBe(true);
    settings.chatReplies.end = end;
  });
});

describe('the quick replies', () => {
  it('show nowhere Lichess offers none: a spectator, a closed chat', () => {
    document.body.innerHTML = page({});
    syncChatPresets();
    expect(document.querySelector('.ln-ext-chat-presets')).toBeNull();
    document.body.innerHTML = page({
      presets: END_PRESETS,
      input: '<input class="mchat__say" disabled />',
    });
    syncChatPresets();
    expect(document.querySelector('.ln-ext-chat-presets')).toBeNull();
  });
});
