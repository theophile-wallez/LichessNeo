import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { mountHeroCoach } from './hero-coach.ts';

// WebGL isn't in happy-dom: the bundle mounts a stand-in, and the settings' 3D switch is the
// test's to flip.
interface Mounted {
  coach: number;
  destroyed: boolean;
}

const mascots = vi.hoisted(() => {
  const mounted: Mounted[] = [];
  return { moving: true, listeners: new Set<(moving: boolean) => void>(), mounted };
});

vi.mock('#content/coach/load.ts', () => ({
  coachesMove: () => mascots.moving,
  loadMascots: () =>
    Promise.resolve(
      mascots.moving
        ? () => {
            const mounted = { coach: 0, destroyed: false };
            mascots.mounted.push(mounted);
            return {
              setCoach: (coach: number) => {
                mounted.coach = coach;
              },
              setComputer: () => {},
              setMood: () => {},
              setTalking: () => {},
              enter: () => {},
              poke: () => {},
              destroy: () => {
                mounted.destroyed = true;
              },
            };
          }
        : null,
    ),
  onCoachMotion: (listener: (moving: boolean) => void) => {
    mascots.listeners.add(listener);
    return () => mascots.listeners.delete(listener);
  },
}));

function switchMotion(moving: boolean): void {
  mascots.moving = moving;
  for (const listener of mascots.listeners) listener(moving);
}

beforeEach(() => {
  mascots.moving = true;
  mascots.mounted.splice(0);
});

afterEach(() => {
  mascots.listeners.clear();
  document.body.innerHTML = '';
});

function host(): HTMLElement {
  const element = document.createElement('div');
  document.body.append(element);
  return element;
}

const still = (element: HTMLElement): string | undefined =>
  element.classList.contains('ln-ext-hero__coach--still')
    ? element.dataset.lnExtAvatarCoach
    : undefined;

describe('the home hero’s coach', () => {
  it('goes still as the 3D is switched off, and comes back live as it’s switched on', async () => {
    const element = host();
    mountHeroCoach(element, 5);
    await flush();
    expect(element.classList.contains('ln-ext-hero__coach--live')).toBe(true);
    expect(still(element)).toBeUndefined();

    switchMotion(false);
    expect(mascots.mounted[0]?.destroyed).toBe(true);
    expect(element.classList.contains('ln-ext-hero__coach--live')).toBe(false);
    expect(still(element)).toBe('5');

    switchMotion(true);
    await flush();
    expect(mascots.mounted[1]?.coach).toBe(5);
    expect(element.classList.contains('ln-ext-hero__coach--live')).toBe(true);
    expect(still(element)).toBeUndefined();
  });

  it('shows its still from the start while the coaches are kept still', async () => {
    mascots.moving = false;
    const element = host();
    mountHeroCoach(element, 2);
    await flush();
    expect(mascots.mounted).toHaveLength(0);
    expect(still(element)).toBe('2');
  });

  it('stops following the switch once the hero is gone', async () => {
    const element = host();
    mountHeroCoach(element, 5);
    await flush();
    element.remove();
    switchMotion(false);
    expect(mascots.listeners.size).toBe(0);
  });
});
