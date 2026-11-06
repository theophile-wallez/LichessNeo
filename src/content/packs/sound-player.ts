import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import StopIcon from '@hugeicons/core-free-icons/StopIcon';
import { createElement, setStyleProperty } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { setHtml } from '#shared/html.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { dataUrlBytes } from '#shared/packs/sniff.ts';
import { SOUND_NAMES, type SoundName } from '#shared/sounds.ts';
import { message } from '#content/platform/runtime.ts';
import { describedBy } from './sound-body.ts';

// A sound set's tile on the Packs card, as a little player
// (styles/pages/settings-packs-items.css): its button plays the set's sounds
// one after the other, its wave lit as they go, what each plays on below.

/** The pause between two sounds, so each is heard apart. */
const GAP_MS = 250;

/** The wave's bars, in % of its height: the set's sounds share them, in order. */
const HEIGHTS = [35, 60, 90, 55, 75, 40, 100, 65, 45, 80, 50, 95, 60, 35, 70, 85, 45, 55];

interface Track {
  readonly sound: SoundName;
  readonly url: string;
}

// One set plays at a time: starting one stops the other.
let stopPlaying: (() => void) | undefined;

function tracks({ sounds = {} }: Pack): Track[] {
  return SOUND_NAMES.flatMap(sound => {
    const url = sounds[sound];
    return url === undefined ? [] : [{ sound, url }];
  });
}

const restingCaption = (count: number): string =>
  count === 1 ? message('packsSoundCountOne') : message('packsSoundCount', String(count));

// Lichess's CSP lets audio load from blob: URLs, not from the data: URLs a pack keeps.
function blobUrl(url: string): string {
  const type = url.slice('data:'.length, url.search(/[;,]/));
  return URL.createObjectURL(new Blob([dataUrlBytes(url)], { type }));
}

interface Parts {
  readonly box: HTMLElement;
  readonly button: HTMLButtonElement;
  readonly bars: readonly HTMLElement[];
  readonly caption: HTMLElement;
}

function draw(list: readonly Track[], parts: Parts, playing: number | undefined): void {
  const { box, button, bars, caption } = parts;
  box.classList.toggle('ln-ext-player--playing', playing !== undefined);
  for (const [i, bar] of bars.entries()) {
    const sound = Math.floor((i * list.length) / bars.length);
    bar.classList.toggle('ln-ext-player__bar--on', sound === playing);
    bar.classList.toggle('ln-ext-player__bar--played', playing !== undefined && sound < playing);
  }
  const label = message(playing === undefined ? 'packsPlaySet' : 'packsStopSet');
  button.setAttribute('aria-label', label);
  button.title = label;
  setHtml(button, hugeicon(playing === undefined ? PlayIcon : StopIcon));
  const track = playing === undefined ? undefined : list[playing];
  caption.textContent = track ? message(describedBy(track.sound)) : restingCaption(list.length);
  caption.title = caption.textContent;
}

function player(list: readonly Track[], parts: Parts): () => void {
  let audio: HTMLAudioElement | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = (): void => {
    audio?.pause();
    if (audio) URL.revokeObjectURL(audio.src);
    clearTimeout(timer);
    audio = undefined;
    if (stopPlaying === stop) stopPlaying = undefined;
    draw(list, parts, undefined);
  };
  const play = (index: number): void => {
    const track = list[index];
    // The card redraws its tiles when the library changes: a tile gone plays no more.
    if (!track || !parts.box.isConnected) return stop();
    if (audio) URL.revokeObjectURL(audio.src);
    const current = new Audio(blobUrl(track.url));
    audio = current;
    // A sound stopped, or another one since, leads nowhere.
    current.addEventListener('ended', () => {
      if (audio === current) timer = setTimeout(() => play(index + 1), GAP_MS);
    });
    current.play().catch(() => {
      if (audio === current) stop();
    });
    draw(list, parts, index);
  };
  return () => {
    if (audio) return stop();
    stopPlaying?.();
    stopPlaying = stop;
    play(0);
  };
}

/** The player over a sound set's tile, in place of a preview. */
export function soundPlayer(item: Pack): HTMLElement {
  const list = tracks(item);
  const box = createElement('div', { className: 'ln-ext-player' });
  const button = createElement('button', {
    className: 'ln-ext-player__play',
    attrs: { type: 'button' },
  });
  const wave = createElement('span', {
    className: 'ln-ext-player__bars',
    attrs: { 'aria-hidden': 'true' },
  });
  const bars = HEIGHTS.map(height => {
    const bar = createElement('span', { className: 'ln-ext-player__bar' });
    setStyleProperty(bar, 'height', `${height}%`);
    return bar;
  });
  wave.append(...bars);
  const caption = createElement('span', { className: 'ln-ext-player__caption' });
  const parts = { box, button, bars, caption };
  button.addEventListener('click', player(list, parts));
  box.append(button, wave, caption);
  draw(list, parts, undefined);
  return box;
}
