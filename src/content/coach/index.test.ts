import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoachMood } from '#shared/coach.ts';
import { flush } from '#shared/testing/timers.ts';
import type { MascotOptions, MascotView } from './mascot/index.ts';
import { showCoach } from './index.ts';

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
    '<button class="lr-ext-coach__avatar"><span class="lr-ext-coach__face"></span></button>';
});

const isLive = (): boolean => document.querySelector('.lr-ext-coach__avatar--live') !== null;

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
});
