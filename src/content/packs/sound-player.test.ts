import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { fakePack, SOUND } from '#shared/testing/packs.ts';
import { fakeWorker } from '#shared/testing/worker.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { soundPlayer } from './sound-player.ts';

// An Audio that plays until told it ended, or that refuses to play.
class FakeAudio extends EventTarget {
  static played: FakeAudio[] = [];
  static refuse = false;
  paused = false;
  readonly src: string;
  constructor(src: string) {
    super();
    this.src = src;
  }
  play(): Promise<void> {
    FakeAudio.played.push(this);
    return FakeAudio.refuse ? Promise.reject(new Error('NotSupportedError')) : Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
  end(): void {
    this.dispatchEvent(new Event('ended'));
  }
}

const set = (name: string, sounds: Pack['sounds']): Pack => ({
  ...fakePack(`file:${name}/`, ['sound']),
  name,
  ...(sounds && { sounds }),
});
const revoke = vi.fn<(url: string) => void>();
const CLICKS = set('clicks', { castle: SOUND, capture: SOUND, 'move-self': SOUND });

function mount(item: Pack): HTMLElement {
  const player = soundPlayer(item);
  document.body.append(player);
  return player;
}

const caption = (player: HTMLElement): string | null | undefined =>
  player.querySelector('.ln-ext-player__caption')?.textContent;
const button = (player: HTMLElement): HTMLButtonElement => {
  const found = queryOne(player, '.ln-ext-player__play', HTMLButtonElement);
  if (!found) throw new Error('No button');
  return found;
};
const lit = (player: HTMLElement): number =>
  queryAll(player, '.ln-ext-player__bar--on', HTMLElement).length;
const last = (): FakeAudio => {
  const audio = FakeAudio.played.at(-1);
  if (!audio) throw new Error('Nothing played');
  return audio;
};

const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  fakeWorker();
  vi.useFakeTimers();
  vi.stubGlobal('chrome', { ...chrome, i18n: { getMessage } });
  vi.stubGlobal('Audio', FakeAudio);
  let blobs = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++blobs}`);
  revoke.mockClear();
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revoke);
});

afterEach(() => {
  // Ends what still plays, so the next test starts with nothing playing.
  for (const player of queryAll(document, '.ln-ext-player--playing', HTMLElement))
    button(player).click();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  FakeAudio.played = [];
  FakeAudio.refuse = false;
  document.body.innerHTML = '';
});

describe('a sound set’s player', () => {
  it('says how many sounds the set has', () => {
    expect(caption(mount(CLICKS))).toBe('packsSoundCount:3');
    expect(caption(mount(set('pop', { notify: SOUND })))).toBe('packsSoundCountOne');
  });

  it('plays the set’s sounds in turn, saying what each plays on, as blob: URLs', async () => {
    const player = mount(CLICKS);
    button(player).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(caption(player)).toBe('packsSoundMoveSelf');
    expect(player.classList).toContain('ln-ext-player--playing');
    expect(button(player).getAttribute('aria-label')).toBe('packsStopSet');
    expect(lit(player)).toBe(6);
    expect(last().src).toBe('blob:1');
    last().end();
    vi.advanceTimersByTime(250);
    expect(caption(player)).toBe('packsSoundCapture');
    expect(revoke).toHaveBeenCalledWith('blob:1');
    last().end();
    vi.advanceTimersByTime(250);
    expect(caption(player)).toBe('packsSoundCastle');
    expect(queryAll(player, '.ln-ext-player__bar--played', HTMLElement)).toHaveLength(12);
    last().end();
    vi.advanceTimersByTime(250);
    expect(FakeAudio.played).toHaveLength(3);
    expect(player.classList).not.toContain('ln-ext-player--playing');
    expect(caption(player)).toBe('packsSoundCount:3');
    expect(lit(player)).toBe(0);
  });

  it('stops on its button', () => {
    const player = mount(CLICKS);
    button(player).click();
    button(player).click();
    expect(last().paused).toBe(true);
    last().end();
    vi.advanceTimersByTime(250);
    expect(FakeAudio.played).toHaveLength(1);
    expect(button(player).getAttribute('aria-label')).toBe('packsPlaySet');
  });

  it('stops another set playing', () => {
    const first = mount(CLICKS);
    const second = mount(set('pop', { notify: SOUND }));
    button(first).click();
    const playing = last();
    button(second).click();
    expect(playing.paused).toBe(true);
    expect(first.classList).not.toContain('ln-ext-player--playing');
    expect(caption(second)).toBe('packsSoundNotify');
  });

  it('stops when a sound can’t play, or once its tile is gone', async () => {
    const player = mount(CLICKS);
    FakeAudio.refuse = true;
    button(player).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(player.classList).not.toContain('ln-ext-player--playing');
    FakeAudio.refuse = false;
    button(player).click();
    player.remove();
    last().end();
    vi.advanceTimersByTime(250);
    expect(FakeAudio.played).toHaveLength(2);
  });
});
