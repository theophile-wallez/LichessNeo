import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoachMood } from '#shared/coach.ts';
import { flush } from '#shared/testing/timers.ts';
import type { MascotOptions, MascotView } from './mascot/index.ts';
import { coach, showCoach } from './index.ts';

// The mascots' bundle, standing in: what each mascot was asked to show, and its first frame
// drawn on demand.
interface Shown {
  coach: number;
  mood: CoachMood | null;
}
const played: Shown[] = [];
let drawn: (() => void) | undefined;

function mountMascot(_host: HTMLElement, options: MascotOptions = {}): MascotView {
  drawn = options.onDrawn;
  const shown: Shown = { coach: 0, mood: null };
  played.push(shown);
  return {
    setCoach: coach => (shown.coach = coach),
    setComputer: () => {},
    setMood: mood => (shown.mood = mood),
    setTalking: () => {},
    enter: () => {},
    poke: () => {},
    destroy: () => {},
  };
}

vi.mock(import('./load.ts'), () => ({ loadMascots: () => Promise.resolve(mountMascot) }));

beforeEach(() => {
  played.length = 0;
  document.body.innerHTML =
    '<button class="ln-ext-coach__avatar"><span class="ln-ext-coach__face"></span></button>';
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

const isLive = (): boolean => document.querySelector('.ln-ext-coach__avatar--live') !== null;

describe('the coach', () => {
  it('stays its still, neutral as the still looks, until its first frame is drawn', async () => {
    showCoach({ coach: 12, mood: 'angry', talking: false });
    await flush();
    expect(played).toEqual([{ coach: 12, mood: null }]);
    expect(isLive()).toBe(false);
    showCoach({ coach: 12, mood: 'sad', talking: false });
    expect(played).toEqual([{ coach: 12, mood: null }]);

    drawn?.();
    expect(isLive()).toBe(true);
    expect(played).toEqual([{ coach: 12, mood: 'sad' }]);
    showCoach({ coach: 12, mood: 'happy', talking: false });
    expect(played).toEqual([{ coach: 12, mood: 'happy' }]);
  });

  it('stays its still while the settings keep the coaches still, and keeps them so', async () => {
    let answer: ((settings: unknown) => void) | undefined;
    vi.stubGlobal('chrome', {
      runtime: { id: 'test' },
      storage: {
        sync: {
          get: (key: string) =>
            new Promise(resolve => (answer = settings => resolve({ [key]: settings }))),
        },
        onChanged: { addListener: () => {} },
      },
    });
    coach.start();
    showCoach({ coach: 5, mood: 'happy', talking: false });
    await flush();
    drawn?.();
    expect(isLive()).toBe(true);

    answer?.({ coachMotion: false, analysisCoach: false });
    await flush();
    expect(isLive()).toBe(false);
    expect(localStorage.getItem('ln-ext-coach-options')).toBe(
      '{"motion":false,"analysis":false,"board":true}',
    );
  });

  it('keeps the switch of the coach’s drawings for the page world', async () => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'test' },
      storage: {
        sync: { get: (key: string) => Promise.resolve({ [key]: { coachBoard: false } }) },
        onChanged: { addListener: () => {} },
      },
    });
    // The settings are read once per content script: a fresh one reads these.
    vi.resetModules();
    const fresh = await import('./index.ts');
    fresh.coach.start();
    await flush();
    expect(localStorage.getItem('ln-ext-coach-options')).toBe(
      '{"motion":true,"analysis":true,"board":false}',
    );
  });
});
