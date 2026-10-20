import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { SquareSchema } from '#shared/testing/square-schema.ts';
import { type SoundName, SoundNameSchema } from '#shared/sounds.ts';
import { ColorSchema, renderBoard } from '#shared/testing/boards.ts';
import { fakeSoundPlayer, type PlayerCall } from './fixtures/sound-player.ts';
import { hookSoundPlayer } from './player.ts';
import { createSession } from './session.ts';
import type { Synth } from './synth/synth.ts';
// Each scenario's calls to Lichess's player, as recorded from the original.
import legacy from './fixtures/legacy-hooks.json' with { type: 'json' };

const StepSchema = z.object({
  call: z.enum(['play', 'move']),
  args: z.array(z.unknown()),
  wait: z.optional(z.number()),
  board: z.optional(z.tuple([z.string(), z.array(SquareSchema), ColorSchema])),
  theme: z.optional(z.string()),
});

const ScenarioSchema = z.object({
  name: z.string(),
  names: z.array(SoundNameSchema),
  steps: z.array(StepSchema),
  paths: z.array(z.tuple([z.string(), z.string()])),
  hooked: z.boolean(),
  calls: z.array(z.unknown()),
  results: z.array(z.string()),
});

// Changed on purpose since: one of ours, picked over Lichess's Pentatonic (its 'music'
// theme), plays in its place, rather than leaving the moves to it.
const CHANGED = new Set(['leaves the music theme alone']);

const scenarios = z
  .array(ScenarioSchema)
  .parse(legacy)
  .filter(scenario => !CHANGED.has(scenario.name));

const describeResult = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  return value instanceof Promise ? 'promise' : typeof value;
};

// The sounds `play()` passed on to Lichess, ours prefixed.
const played = (calls: readonly PlayerCall[]): unknown[] =>
  calls.filter(call => call[0] === 'play').map(call => call[1]);

// JSON turns an undefined volume into null, as it did when recording.
const asRecorded = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'],
  });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('hookSoundPlayer', () => {
  it.each(scenarios)('$name, as the original did', async scenario => {
    const { sound, calls } = fakeSoundPlayer();
    const urls = new Map(scenario.names.map(name => [name, `blob:${name}`]));
    expect(hookSoundPlayer(sound, urls, createSession())).toBe(true);
    expect([...sound.paths]).toEqual(scenario.paths);
    expect(sound.lnExtHooked).toBe(scenario.hooked);
    const results: string[] = [];
    for (const step of scenario.steps) {
      if (step.board) {
        const [placement, lastMove, orientation] = step.board;
        renderBoard({ placement, lastMove, orientation });
      }
      if (step.theme !== undefined) sound.theme = step.theme;
      const [first, second] = step.args;
      const returned =
        step.call === 'play' ? sound.play(first, second) : sound.move(...step.args.slice(0, 1));
      results.push(describeResult(returned));
      await vi.advanceTimersByTimeAsync(step.wait ?? 40);
    }
    expect(asRecorded(calls)).toEqual(scenario.calls);
    expect(results).toEqual(scenario.results);
  });

  it('only adds the sounds when another copy of the script hooked the player first', () => {
    const { sound, calls } = fakeSoundPlayer();
    sound.lnExtHooked = true;
    const { play } = sound;
    const session = createSession();
    expect(hookSoundPlayer(sound, new Map([['capture', 'blob:capture']]), session)).toBe(false);
    expect(sound.paths.get('ln-ext-capture')).toBe('blob:capture');
    expect(sound.play).toBe(play);
    expect(session.playOurs).toBeNull();
    expect(calls).toEqual([]);
  });

  it('plays the pack’s capture or move for a sound it lacks, else Lichess’s', () => {
    const { sound, calls } = fakeSoundPlayer();
    hookSoundPlayer(sound, new Map([['move-self', 'blob:move-self']]), createSession());
    sound.move({ san: 'exd5', ply: 3 });
    sound.move({ san: 'O-O', ply: 9 });
    expect(played(calls)).toEqual(['capture', 'ln-ext-move-self']);
  });

  it('plays a capture’s sound for a capture that checks, when the pack has no check sound', () => {
    const { sound, calls } = fakeSoundPlayer();
    hookSoundPlayer(sound, new Map([['capture', 'blob:capture']]), createSession());
    sound.move({ san: 'Bxf7+', ply: 5 });
    sound.move({ san: 'Qh5+', ply: 7 });
    // Lichess plays its own check sound beside it: the pack has none to replace it.
    sound.play('check');
    expect(played(calls)).toEqual(['ln-ext-capture', 'move', 'check']);
  });

  it('remembers the board after each move, for the next one', async () => {
    const { sound } = fakeSoundPlayer();
    const session = createSession();
    hookSoundPlayer(sound, new Map([['move-self', 'blob:move-self']]), session);
    renderBoard({ placement: '4k3/8/8/8/8/8/8/4K3', orientation: 'white' });
    sound.move({ san: 'Kd2', ply: 1 });
    await vi.advanceTimersByTimeAsync(20);
    expect(session.lastPieces?.size).toBe(2);
    renderBoard({ placement: '4k3/8/8/8/8/8/3K4/8', orientation: 'white', lastMove: ['e1', 'd2'] });
    const movedAt = Date.now();
    sound.move({ name: 'move' });
    expect(session.lastMoveSoundAt).toBe(movedAt);
    await vi.advanceTimersByTimeAsync(20);
    expect(session.lastPieces?.has('d2')).toBe(true);
    // Played on the next frame, once the board is redrawn.
    expect(session.lastMoveSoundAt).toBeGreaterThan(movedAt);
  });

  it('plays every sound with the extension’s set while it’s picked, at Lichess’s volume', () => {
    const { sound, calls } = fakeSoundPlayer();
    sound.getVolume = () => 0.5;
    const synthPlayed: [SoundName, number][] = [];
    const synth: Synth = {
      play: (name, volume) => synthPlayed.push([name, volume]),
      setPlace: () => {},
    };
    let picked: Synth | null = synth;
    hookSoundPlayer(sound, new Map(), createSession(), () => picked);
    sound.play('genericNotify');
    sound.play('check');
    sound.move({ san: 'exd5', ply: 3 });
    sound.play('berserk');
    expect(synthPlayed).toEqual([
      ['game-start', 0.5],
      ['capture', 0.5],
    ]);
    expect(calls).toEqual([['play', 'berserk', 1]]);
    // Picked away from: every call goes to Lichess again.
    picked = null;
    sound.move({ san: 'exd5', ply: 3 });
    expect(calls.at(-1)).toEqual(['move', { san: 'exd5', ply: 3 }]);
  });

  describe('jumps', () => {
    const ours: readonly SoundName[] = ['move-self', 'move-opponent', 'capture'];

    const hooked = (): ReturnType<typeof fakeSoundPlayer> => {
      const player = fakeSoundPlayer();
      hookSoundPlayer(
        player.sound,
        new Map(ours.map(name => [name, `blob:${name}`])),
        createSession(),
      );
      return player;
    };

    it('plays the move on the board after a step back, once it is redrawn', async () => {
      const { sound, calls } = hooked();
      renderBoard({ placement: '4k3/8/8/8/8/5n2/8/4K3', orientation: 'white' });
      sound.saySan?.('Nf3', true);
      expect(played(calls)).toEqual([]);
      await vi.advanceTimersByTimeAsync(20);
      expect(played(calls)).toEqual(['ln-ext-move-opponent']);
      // Lichess still speaks it.
      expect(calls[0]).toEqual(['saySan', 'Nf3', true]);
    });

    it('plays nothing more for a step forward, which got its sound', async () => {
      const { sound, calls } = hooked();
      renderBoard({ placement: '4k3/8/8/8/8/8/8/4K3', orientation: 'white' });
      sound.move({ san: 'Kxd2', ply: 1 });
      sound.saySan?.('Kxd2', true);
      await vi.advanceTimersByTimeAsync(20);
      expect(played(calls)).toEqual(['ln-ext-capture']);
    });

    it('plays nothing for a move being played, whose SAN is spoken without cutting', async () => {
      const { sound, calls } = hooked();
      renderBoard({ placement: '4k3/8/8/8/8/8/8/4K3', orientation: 'white' });
      sound.saySan?.('Kd2', false);
      sound.saySan?.('Kd2');
      await vi.advanceTimersByTimeAsync(20);
      expect(played(calls)).toEqual([]);
    });

    it('lets a move played just after a step back speak for both', async () => {
      const { sound, calls } = hooked();
      renderBoard({ placement: '4k3/8/8/8/8/8/8/4K3', orientation: 'white' });
      sound.saySan?.('e4', true);
      await Promise.resolve();
      sound.move({ san: 'Kd2', ply: 1 });
      await vi.advanceTimersByTimeAsync(20);
      expect(played(calls)).toEqual(['ln-ext-move-self']);
    });

    it('plays ours over Lichess’s Pentatonic, and none of its notes', async () => {
      const { sound, calls } = hooked();
      sound.theme = 'music';
      renderBoard({ placement: '4k3/8/8/8/8/5n2/8/4K3', orientation: 'white' });
      sound.saySan?.('Nf3', true);
      await vi.advanceTimersByTimeAsync(20);
      expect(played(calls)).toEqual(['ln-ext-move-opponent']);
      sound.move({ san: 'Kd2', ply: 1, filter: 'music' });
      sound.move({ san: 'Kd2', ply: 1 });
      await vi.advanceTimersByTimeAsync(20);
      expect(played(calls)).toEqual(['ln-ext-move-opponent', 'ln-ext-move-self']);
      expect(calls.filter(call => call[0] === 'move')).toEqual([]);
    });
  });
});
