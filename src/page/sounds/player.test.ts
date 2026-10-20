import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { SquareSchema } from '#shared/testing/square-schema.ts';
import { type SoundName, SoundNameSchema } from '#shared/sounds.ts';
import { ColorSchema, renderBoard } from '#shared/testing/boards.ts';
import { fakeSoundPlayer, type PlayerCall } from './fixtures/sound-player.ts';
import { parsePlacement } from '#shared/chess/fen.ts';
import { hookSoundPlayer, setSoundPaths } from './player.ts';
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

// Each sound's takes, `count` of them.
const takes = (...sounds: [SoundName, number][]): Map<SoundName, string[]> =>
  new Map(
    sounds.map(([name, count]) => [
      name,
      Array.from({ length: count }, (_, i) => `blob:${name}-${i + 1}`),
    ]),
  );

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
    const urls = new Map(scenario.names.map(name => [name, [`blob:${name}`]]));
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
    expect(hookSoundPlayer(sound, new Map([['capture', ['blob:capture']]]), session)).toBe(false);
    expect(sound.paths.get('ln-ext-capture')).toBe('blob:capture');
    expect(sound.play).toBe(play);
    expect(session.playOurs).toBeNull();
    expect(calls).toEqual([]);
  });

  it('plays the pack’s capture or move for a sound it lacks, else Lichess’s', () => {
    const { sound, calls } = fakeSoundPlayer();
    hookSoundPlayer(sound, new Map([['move-self', ['blob:move-self']]]), createSession());
    sound.move({ san: 'exd5', ply: 3 });
    sound.move({ san: 'O-O', ply: 9 });
    expect(played(calls)).toEqual(['capture', 'ln-ext-move-self']);
  });

  it('plays a capture’s sound for a capture that checks, when the pack has no check sound', () => {
    const { sound, calls } = fakeSoundPlayer();
    hookSoundPlayer(sound, new Map([['capture', ['blob:capture']]]), createSession());
    sound.move({ san: 'Bxf7+', ply: 5 });
    sound.move({ san: 'Qh5+', ply: 7 });
    // Lichess plays its own check sound beside it: the pack has none to replace it.
    sound.play('check');
    expect(played(calls)).toEqual(['ln-ext-capture', 'move', 'check']);
  });

  it('remembers the board after each move, for the next one', async () => {
    const { sound } = fakeSoundPlayer();
    const session = createSession();
    hookSoundPlayer(sound, new Map([['move-self', ['blob:move-self']]]), session);
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

  describe('takes', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('plays a take at random, never the one just played', () => {
      const { sound, calls } = fakeSoundPlayer();
      hookSoundPlayer(sound, takes(['capture', 3]), createSession());
      for (let i = 0; i < 3; i++) sound.move({ san: 'exd5', ply: 3 });
      expect(played(calls)).toEqual(['ln-ext-capture', 'ln-ext-capture-2', 'ln-ext-capture']);
    });

    it('plays a long move’s slide, one of its reach’s takes, and a knight’s jump', () => {
      const { sound, calls } = fakeSoundPlayer();
      hookSoundPlayer(
        sound,
        takes(['move-self', 1], ['move-slide', 18], ['move-knight', 1]),
        createSession(),
      );
      sound.move({ san: 'Ra8', uci: 'a1a8', ply: 1 });
      sound.move({ san: 'Bd3', uci: 'f1d3', ply: 3 });
      sound.move({ san: 'Nf3', uci: 'g1f3', ply: 5 });
      sound.move({ san: 'Kd2', uci: 'e1d2', ply: 7 });
      expect(played(calls)).toEqual([
        'ln-ext-move-slide-16',
        'ln-ext-move-slide',
        'ln-ext-move-knight',
        'ln-ext-move-self',
      ]);
    });

    it('plays a promotion that captures as one, checking or not, if the set has it', () => {
      const { sound, calls } = fakeSoundPlayer();
      const urls = takes(['move-check', 1], ['promote', 1], ['capture-promote', 2]);
      hookSoundPlayer(sound, urls, createSession());
      sound.move({ san: 'exd8=Q', uci: 'e7d8q', ply: 1 });
      sound.move({ san: 'exd8=Q+', uci: 'e7d8q', ply: 3 });
      sound.move({ san: 'e8=Q+', uci: 'e7e8q', ply: 5 });
      urls.delete('capture-promote');
      sound.move({ san: 'exd8=Q+', uci: 'e7d8q', ply: 7 });
      expect(played(calls)).toEqual([
        'ln-ext-capture-promote',
        'ln-ext-capture-promote-2',
        'ln-ext-move-check',
        'ln-ext-move-check',
      ]);
    });

    it('tells a promotion on the board from the pieces before it', async () => {
      const { sound, calls } = fakeSoundPlayer();
      const session = createSession();
      hookSoundPlayer(sound, takes(['capture', 1], ['capture-promote', 1]), session);
      session.lastPieces = parsePlacement('3rk3/4P3/8/8/8/8/8/K7');
      renderBoard({
        placement: '3Qk3/8/8/8/8/8/8/K7',
        orientation: 'white',
        lastMove: ['e7', 'd8'],
      });
      sound.move({ name: 'capture' });
      await vi.advanceTimersByTimeAsync(20);
      expect(played(calls)).toEqual(['ln-ext-capture-promote']);
    });
  });

  describe('jumps', () => {
    const ours: readonly SoundName[] = ['move-self', 'move-opponent', 'capture'];

    const hooked = (): ReturnType<typeof fakeSoundPlayer> => {
      const player = fakeSoundPlayer();
      hookSoundPlayer(
        player.sound,
        new Map(ours.map(name => [name, [`blob:${name}`]])),
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

describe('setSoundPaths', () => {
  it('lets Lichess’s player drop the sounds it decoded that are no longer picked', () => {
    const { sound } = fakeSoundPlayer();
    const decoded = new Map([
      ['blob:old', {}],
      ['blob:kept', {}],
      ['https://lichess1.org/sound/standard/Move.mp3', {}],
    ]);
    sound.sounds = decoded;
    sound.paths.set('move', 'https://lichess1.org/sound/standard/Move.mp3');
    setSoundPaths(
      sound,
      new Map([
        ['capture', ['blob:old']],
        ['castle', ['blob:kept']],
      ]),
    );
    setSoundPaths(sound, new Map([['castle', ['blob:kept', 'blob:new']]]));
    expect([...decoded.keys()]).toEqual([
      'blob:kept',
      'https://lichess1.org/sound/standard/Move.mp3',
    ]);
    expect([...sound.paths]).toEqual([
      ['move', 'https://lichess1.org/sound/standard/Move.mp3'],
      ['ln-ext-castle', 'blob:kept'],
      ['ln-ext-castle-2', 'blob:new'],
    ]);
  });

  it('has the first sound decoded at once, and nothing with none', () => {
    const { sound } = fakeSoundPlayer();
    const load = vi.fn<(name: string) => unknown>(() => Promise.reject(new Error('no audio')));
    sound.load = load;
    setSoundPaths(sound, new Map());
    expect(load).not.toHaveBeenCalled();
    setSoundPaths(sound, new Map([['capture', ['blob:capture', 'blob:capture-2']]]));
    expect(load.mock.calls).toEqual([['ln-ext-capture']]);
  });
});
