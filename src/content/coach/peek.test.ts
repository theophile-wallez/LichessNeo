import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoachMood } from '#shared/coach.ts';
import { flush } from '#shared/testing/timers.ts';
import type { MascotOptions } from './mascot/index.ts';
import { syncPeekCoach } from './peek.ts';

// WebGL isn't in happy-dom: the bundle mounts a stand-in, drawn when the test says so.
interface Mounted {
  readonly host: HTMLElement;
  readonly draw: () => void;
  readonly moods: CoachMood[];
  destroyed: boolean;
}

const mascots = vi.hoisted(() => ({ mounted: new Array<Mounted>() }));

vi.mock('./load.ts', () => ({
  loadMascots: () =>
    Promise.resolve((host: HTMLElement, options: MascotOptions = {}) => {
      const mounted: Mounted = {
        host,
        draw: () => options.onDrawn?.(),
        moods: [],
        destroyed: false,
      };
      mascots.mounted.push(mounted);
      return {
        setCoach: () => {},
        setComputer: () => {},
        setMood: (mood: CoachMood) => mounted.moods.push(mood),
        setTalking: () => {},
        enter: () => {},
        poke: () => {},
        destroy: () => {
          mounted.destroyed = true;
        },
      };
    }),
  onCoachMotion: () => () => {},
}));

const root = document.documentElement;

function strip(mood: CoachMood): HTMLElement {
  document.body.innerHTML = `<div id="ln-ext-review"><span class="ln-ext-end__peek"><span class="ln-ext-end__peek-coach" data-ln-ext-avatar-coach="3" data-ln-ext-mood="${mood}"></span></span></div>`;
  const coach = document.querySelector('.ln-ext-end__peek-coach');
  if (!(coach instanceof HTMLElement)) throw new Error('no coach');
  return coach;
}

async function mountedIn(holder: HTMLElement): Promise<Mounted> {
  syncPeekCoach();
  await flush();
  const mounted = mascots.mounted.at(-1);
  if (mounted?.host.parentElement !== holder) throw new Error('no mascot in the strip');
  return mounted;
}

beforeEach(() => {
  vi.stubGlobal('requestIdleCallback', (run: () => void) => setTimeout(run, 0));
  root.classList.toggle('ln-ext-review-folded', true);
  delete root.dataset.lnExtCoach;
  syncPeekCoach();
});

describe('syncPeekCoach', () => {
  it('plays the folded card’s coach neutral, as its still, then sad once drawn', async () => {
    const holder = strip('sad');
    const mascot = await mountedIn(holder);
    expect(mascot.moods.at(-1)).toBe('neutral');
    mascot.draw();
    expect(holder.dataset.lnExtLive).toBe('');
    expect(mascot.moods.at(-1)).toBe('sad');
  });

  it('takes the mascot away once the card unfolds', async () => {
    const mascot = await mountedIn(strip('proud'));
    root.classList.toggle('ln-ext-review-folded', false);
    syncPeekCoach();
    expect(mascot.destroyed).toBe(true);
  });

  it('shows none when the settings hide the coach', async () => {
    root.dataset.lnExtCoach = 'none';
    strip('sad');
    const before = mascots.mounted.length;
    syncPeekCoach();
    await flush();
    expect(mascots.mounted.length).toBe(before);
  });
});
