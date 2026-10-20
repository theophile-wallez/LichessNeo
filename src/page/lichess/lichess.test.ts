import { afterEach, describe, expect, it } from 'vitest';
import { isHashedAsset } from './assets.ts';
import { cgKey } from './chessground.ts';
import { method } from './method.ts';
import { readMoveOptions, type SoundPlayer, soundPlayer, soundVolume } from './sound.ts';
import { lastNodeId, parentPath, pathPrefixes } from './tree.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

describe('cgKey', () => {
  it('reads the square chessground keeps on the element', () => {
    const piece = document.createElement('piece');
    expect(cgKey(piece)).toBeNull();
    expect(cgKey(Object.assign(piece, { cgKey: 'e4' }))).toBe('e4');
    expect(cgKey(Object.assign(document.createElement('piece'), { cgKey: 'a0' }))).toBeNull();
    expect(cgKey(Object.assign(document.createElement('piece'), { cgKey: 42 }))).toBeNull();
  });
});

describe('tree paths', () => {
  it('read a path as its nodes’ two-character ids', () => {
    expect(parentPath('')).toBe('');
    expect(parentPath('/?')).toBe('');
    expect(parentPath('/?WG.>')).toBe('/?WG');
    expect(lastNodeId('/?WG.>')).toBe('.>');
    expect(lastNodeId('')).toBe('');
    expect(pathPrefixes('')).toEqual([]);
    expect(pathPrefixes('/?')).toEqual(['/?']);
    expect(pathPrefixes('/?WG.>')).toEqual(['/?', '/?WG', '/?WG.>']);
  });
});

describe('method', () => {
  it('takes a function, and nothing else', () => {
    const schema = method<[path: string]>();
    expect(schema.safeParse((path: string) => path.length).success).toBe(true);
    expect(schema.safeParse('nodeAtPath').success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(false);
  });
});

const player = (): Record<string, unknown> => ({
  paths: new Map(),
  play: () => Promise.resolve(),
  move: () => Promise.resolve(),
});

describe('soundPlayer', () => {
  it('is the live object, once Lichess has set it up', () => {
    expect(soundPlayer()).toBeNull();
    Object.assign(window, { site: {} });
    expect(soundPlayer()).toBeNull();
    const sound = player();
    Object.assign(window, { site: { sound } });
    expect(soundPlayer()).toBe(sound);
  });

  it('needs its paths and both methods', () => {
    Object.assign(window, { site: { sound: { ...player(), paths: {} } } });
    expect(soundPlayer()).toBeNull();
    Object.assign(window, { site: { sound: { ...player(), move: 'move' } } });
    expect(soundPlayer()).toBeNull();
    Object.assign(window, { site: { sound: { ...player(), changeSet: 'piano' } } });
    expect(soundPlayer()).toBeNull();
  });
});

const withVolume = (extra: Partial<SoundPlayer>): SoundPlayer => ({
  paths: new Map(),
  play: () => Promise.resolve(),
  move: () => Promise.resolve(),
  ...extra,
});

describe('soundVolume', () => {
  it('is the slider’s, Lichess’s default before it’s moved, and none for the silent set', () => {
    expect(soundVolume(withVolume({ getVolume: () => 0.25, enabled: () => true }))).toBe(0.25);
    expect(soundVolume(withVolume({ getVolume: () => 0 }))).toBe(0);
    expect(soundVolume(withVolume({ getVolume: () => Number.NaN }))).toBe(0.7);
    expect(soundVolume(withVolume({}))).toBe(0.7);
    expect(soundVolume(withVolume({ getVolume: () => 1, enabled: () => false }))).toBe(0);
  });
});

describe('readMoveOptions', () => {
  it('reads what move() is called with, a field of another type as missing', () => {
    expect(
      readMoveOptions({ san: 'Nf3', ply: 1, filter: 'music', volume: 0.5, uci: 'g1f3' }),
    ).toEqual({
      san: 'Nf3',
      uci: 'g1f3',
      ply: 1,
      filter: 'music',
      volume: 0.5,
    });
    expect(readMoveOptions({ name: 'capture', san: null, ply: '3' })).toEqual({ name: 'capture' });
    expect(readMoveOptions(undefined)).toEqual({});
    expect(readMoveOptions(7)).toEqual({});
  });
});

describe('isHashedAsset', () => {
  it('tells the files Lichess’s manifest lists, and none without one', () => {
    expect(isHashedAsset('piece/cburnett/wP.webp')).toBe(false);
    Object.assign(window, { site: { manifest: { hashed: { 'piece/cburnett/wP.webp': 'a1b2' } } } });
    expect(isHashedAsset('piece/cburnett/wP.webp')).toBe(true);
    expect(isHashedAsset('piece/alpha/wP.webp')).toBe(false);
    Object.assign(window, { site: { manifest: {} } });
    expect(isHashedAsset('piece/cburnett/wP.webp')).toBe(false);
  });
});
