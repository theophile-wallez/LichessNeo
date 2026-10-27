import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { showPanelPart } from '#content/layout/panel-tabs.ts';
import { syncChatPresets } from './chat-presets.ts';

vi.mock('#content/layout/panel-tabs.ts', () => ({
  showPanelPart: vi.fn<(part: string) => void>(),
}));

// lila's ui/lib/src/chat/preset.ts: the end group, its key as the text, its words as the title.
const PRESETS =
  '<div class="mchat__presets"><span title="Good game">gg</span><span title="Well played">wp</span>' +
  '<span title="Thank you">ty</span></div>';

const FOLLOW_UP =
  '<div class="follow-up"><button class="fbt rematch">Rematch</button>' +
  '<a class="fbt" href="/abcd1234/analysis">Analysis board</a></div>';

const page = (presets: string): string =>
  `<main class="round"><div class="round__side"><section class="mchat">` +
  `<div class="mchat__content discussion"><ol class="mchat__messages"></ol>${presets}</div>` +
  `</section></div><div class="rcontrols">${FOLLOW_UP}</div></main>`;

const replies = (): string[] =>
  queryAll(document, '.ln-ext-chat-presets__reply', HTMLElement).map(reply => reply.textContent);

const lichessReply = (key: string): HTMLElement | undefined =>
  queryAll(document, '.mchat__presets > span', HTMLElement).find(
    reply => reply.textContent === key,
  );

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('the quick replies at a game’s end', () => {
  it('show Lichess’s replies by their words, before its buttons, in place of the chat’s', () => {
    document.body.innerHTML = page(PRESETS);
    syncChatPresets();
    syncChatPresets();
    expect(replies()).toEqual(['Good game', 'Well played', 'Thank you']);
    const followUp = queryOne(document, '.follow-up', HTMLElement);
    expect(followUp?.firstElementChild?.classList.contains('ln-ext-chat-presets')).toBe(true);
    // The analysis link stays the last button (page/game-over/chips.ts).
    expect(followUp?.lastElementChild?.getAttribute('href')).toBe('/abcd1234/analysis');
    expect(queryOne(document, 'main.round', HTMLElement)?.dataset.lnExtChatPresets).toBe('');
  });

  it('send through Lichess’s own reply, then open the chat', () => {
    document.body.innerHTML = page(PRESETS);
    syncChatPresets();
    const sent = vi.fn<() => void>();
    lichessReply('wp')?.addEventListener('click', sent);
    queryAll(document, '.ln-ext-chat-presets__reply', HTMLElement)[1]?.click();
    expect(sent).toHaveBeenCalledOnce();
    expect(showPanelPart).toHaveBeenCalledWith('chat');
  });

  it('follow Lichess as it takes away each one said, then all of them', () => {
    document.body.innerHTML = page(PRESETS);
    syncChatPresets();
    lichessReply('gg')?.classList.add('disabled');
    syncChatPresets();
    expect(replies()).toEqual(['Well played', 'Thank you']);
    queryOne(document, '.mchat__presets', HTMLElement)?.remove();
    syncChatPresets();
    expect(document.querySelector('.ln-ext-chat-presets')).toBeNull();
    expect(queryOne(document, 'main.round', HTMLElement)?.dataset.lnExtChatPresets).toBeUndefined();
  });

  it('show nothing where Lichess offers none (a spectator, the chat’s notes open)', () => {
    document.body.innerHTML = page('');
    syncChatPresets();
    expect(document.querySelector('.ln-ext-chat-presets')).toBeNull();
  });
});
