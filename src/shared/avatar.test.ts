import { describe, expect, it } from 'vitest';
import { AVATAR_COLORS, avatarOf, nameHash, userInHref } from './avatar.ts';
import { ANIMAL_COACHES, ROBOT_COACH } from './coach.ts';

// Names in the shape of Lichess's: letters, digits, `_` and `-`.
const NAMES = Array.from({ length: 4200 }, (_, i) => `player_${i.toString(36)}`);

describe('avatarOf', () => {
  it('gives a name the same avatar every time', () => {
    expect(avatarOf('DrNykterstein')).toEqual({ coach: 1, color: 'orange' });
    expect(avatarOf('Hikaru')).toEqual({ coach: 2, color: 'cyan' });
    expect(avatarOf('Kaan_Burak')).toEqual({ coach: 3, color: 'purple' });
  });

  it('ignores case and the spaces around a name, as Lichess does', () => {
    expect(avatarOf(' DRNYKTERSTEIN ')).toEqual(avatarOf('drnykterstein'));
  });

  it('never puts a coach on a color its fur melts into', () => {
    const clashes = new Set([
      '2 orange',
      '3 green',
      '4 pink',
      '4 red',
      '5 green',
      '6 orange',
      '7 cyan',
    ]);
    const picked = NAMES.map(name => avatarOf(name)).map(({ coach, color }) => `${coach} ${color}`);
    expect(picked.filter(pair => clashes.has(pair))).toEqual([]);
  });

  it('never gives a name the robot, which is the computer’s', () => {
    const coaches = new Set(NAMES.map(name => avatarOf(name).coach));
    expect(coaches.has(ROBOT_COACH)).toBe(false);
    expect(coaches.size).toBe(ANIMAL_COACHES);
  });

  it('spreads names over every other pair, about evenly', () => {
    const counts = new Map<string, number>();
    for (const { coach, color } of NAMES.map(name => avatarOf(name))) {
      const pair = `${coach} ${color}`;
      counts.set(pair, (counts.get(pair) ?? 0) + 1);
    }
    expect(counts.size).toBe(ANIMAL_COACHES * AVATAR_COLORS.length - 7);
    // 100 names a pair on average.
    for (const count of counts.values()) expect(count).toBeGreaterThan(60);
    for (const count of counts.values()) expect(count).toBeLessThan(140);
  });
});

describe('nameHash', () => {
  it('sets names one letter apart far apart', () => {
    const changed = (nameHash('alice') ^ nameHash('alicf')).toString(2).replace(/0/g, '');
    expect(changed.length).toBeGreaterThan(8);
  });

  it('is an unsigned 32-bit number', () => {
    for (const name of NAMES.slice(0, 100)) {
      const hash = nameHash(name);
      expect(Number.isInteger(hash) && hash >= 0 && hash < 2 ** 32).toBe(true);
    }
  });
});

describe('userInHref', () => {
  it.each([
    ['/@/DrNykterstein', 'DrNykterstein'],
    ['https://lichess.org/@/Kaan_Burak/all', 'Kaan_Burak'],
    ['/@/some-one?mod', 'some-one'],
  ])('reads the user of %s', (href, user) => {
    expect(userInHref(href)).toBe(user);
  });

  it.each([null, undefined, '', '/patron', '/fide/2016192/Nakamura_Hikaru'])(
    'finds no user in %s',
    href => {
      expect(userInHref(href)).toBeUndefined();
    },
  );
});
