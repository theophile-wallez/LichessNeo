import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import type { MascotOptions } from './mascot/index.ts';
import { MascotSpot } from './spot.ts';

// WebGL isn't in happy-dom: the bundle mounts a stand-in, drawn when the test says so, and the
// settings' 3D switch is the test's to flip.
interface Mounted {
  readonly host: HTMLElement;
  readonly draw: () => void;
  destroyed: boolean;
}

const mascots = vi.hoisted(() => {
  const mounted: Mounted[] = [];
  return { moving: true, listeners: new Set<(moving: boolean) => void>(), mounted };
});

vi.mock('./load.ts', () => ({
  loadMascots: () =>
    Promise.resolve(
      mascots.moving
        ? (host: HTMLElement, options: MascotOptions = {}) => {
            const mounted = { host, draw: () => options.onDrawn?.(), destroyed: false };
            mascots.mounted.push(mounted);
            return {
              setCoach: () => {},
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

function holderOf(): HTMLElement {
  const holder = document.createElement('div');
  document.body.append(holder);
  return holder;
}

describe('a mascot’s spot', () => {
  it('marks its holder live once drawn, and takes the mascot off and back as the 3D is switched', async () => {
    const spot = new MascotSpot({ className: 'ln-ext-test', framing: 'bust' });
    const holder = holderOf();
    spot.sync(holder, 'neutral', { coach: 3 });
    await flush();
    mascots.mounted[0]?.draw();
    expect(holder.dataset.lnExtLive).toBe('');

    switchMotion(false);
    expect(mascots.mounted[0]?.destroyed).toBe(true);
    expect(holder.dataset.lnExtLive).toBeUndefined();
    expect(holder.querySelector('.ln-ext-mascot')).toBeNull();

    switchMotion(true);
    await flush();
    expect(mascots.mounted).toHaveLength(2);
    mascots.mounted[1]?.draw();
    expect(holder.dataset.lnExtLive).toBe('');
  });

  it('stops following the switch once its holder goes', async () => {
    const spot = new MascotSpot({ className: 'ln-ext-test', framing: 'bust' });
    const holder = holderOf();
    spot.sync(holder, 'neutral', { coach: 3 });
    await flush();
    expect(mascots.listeners.size).toBe(1);
    spot.sync(null, 'neutral', { coach: 3 });
    expect(mascots.listeners.size).toBe(0);
    expect(mascots.mounted[0]?.destroyed).toBe(true);
  });

  it('leaves a mascot drawn after it was taken off unmarked', async () => {
    const spot = new MascotSpot({ className: 'ln-ext-test', framing: 'bust' });
    const holder = holderOf();
    spot.sync(holder, 'neutral', { coach: 3 });
    await flush();
    switchMotion(false);
    mascots.mounted[0]?.draw();
    expect(holder.dataset.lnExtLive).toBeUndefined();
  });
});
