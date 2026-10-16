// Lichess's quick pairing pools (lila's PoolList), by speed: the cards'
// buttons, which join the pool of the same id.

export const CARD_SPEEDS = ['bullet', 'blitz', 'rapid', 'classical'] as const;

export type CardSpeed = (typeof CARD_SPEEDS)[number];

export const POOLS: Readonly<Record<CardSpeed, readonly string[]>> = {
  bullet: ['1+0', '2+1'],
  blitz: ['3+0', '3+2', '5+0', '5+3'],
  rapid: ['10+0', '10+5', '15+10'],
  classical: ['30+0', '30+20'],
};

/** The pool a player who never played one is offered first. */
export const FIRST_POOL = '10+0';

/** The speed of a pool's games. */
export const speedOfPool = (id: string): CardSpeed | undefined =>
  CARD_SPEEDS.find(speed => POOLS[speed].includes(id));

/** "10 min" for 10+0, "2 + 1" for 2+1: a pool's label in any language. */
export function poolLabel(id: string): string {
  const [minutes, increment] = id.split('+');
  return increment === '0' ? `${minutes} min` : `${minutes} + ${increment}`;
}

/** The pool of a clock in seconds, if Lichess has one. */
export function poolOfClock(initial: number, increment: number): string | null {
  const id = `${initial / 60}+${increment}`;
  return Object.values(POOLS).some(ids => ids.includes(id)) ? id : null;
}
