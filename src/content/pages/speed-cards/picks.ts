import { z } from 'zod/mini';
import {
  ClockSchema,
  speedOfClock,
  VARIANTS,
  type CustomSeek,
  type SeekPerf,
} from '#shared/custom-seek.ts';
import { CARD_SPEEDS, POOLS, poolOfClock } from './pools.ts';

// The home's cards as the settings pick them (content/settings/pairing-page.ts),
// in their order: a speed's, with its pools, or one of the player's own, a
// variant and up to four time controls, each a button that seeks its game.

/** As many time controls as a speed card's pools: Blitz's four. */
export const MAX_CLOCKS = 4;

export const CustomCardSchema = z.object({
  variant: z.enum(VARIANTS),
  rated: z.boolean(),
  clocks: z.array(ClockSchema).check(z.minLength(1), z.maxLength(MAX_CLOCKS)),
});

export type CustomCard = z.infer<typeof CustomCardSchema>;

export const CardPickSchema = z.union([
  z.object({ speed: z.enum(CARD_SPEEDS) }),
  z.object({ custom: CustomCardSchema }),
]);

export type CardPick = z.infer<typeof CardPickSchema>;

/** Room for three rows of four. */
export const MAX_PICKS = 12;

/** Lichess's quick pairing as it is: a card per speed. */
export const DEFAULT_PICKS: CardPick[] = CARD_SPEEDS.map(speed => ({ speed }));

/** The settings' field: one card at least, the defaults if it can't be read. */
export const CardPicksSchema = z.catch(
  z.array(CardPickSchema).check(z.minLength(1), z.maxLength(MAX_PICKS)),
  DEFAULT_PICKS,
);

/** The games a card of the player's own seeks, one per time control. */
export const seeksOf = ({ variant, rated, clocks }: CustomCard): CustomSeek[] =>
  clocks.map(({ minutes, increment }) => ({ variant, minutes, increment, rated }));

/** The rating a card of the player's own counts in: its variant's, or its first clock's speed. */
export function perfOfCard({ variant, clocks }: CustomCard): SeekPerf {
  if (variant !== 'standard') return variant;
  const [clock] = clocks;
  return clock ? speedOfClock(clock.minutes, clock.increment) : 'blitz';
}

/** What tells a game from another, a card's button's. */
export const seekKey = ({ variant, minutes, increment, rated }: CustomSeek): string =>
  `${variant}/${minutes}+${increment}/${rated ? 'rated' : 'casual'}`;

/** What tells a card from another: no two in the list have the same. */
export const pickKey = (pick: CardPick): string =>
  'speed' in pick ? pick.speed : seeksOf(pick.custom).map(seekKey).join(',');

/** Every game the cards of the player's own seek. */
export const customSeeks = (picks: readonly CardPick[]): CustomSeek[] =>
  picks.flatMap(pick => ('custom' in pick ? seeksOf(pick.custom) : []));

/** The pool that plays `seek`, if one does: Standard, rated, signed in. */
export function poolOfSeek(seek: CustomSeek, signedIn: boolean): string | null {
  if (seek.variant !== 'standard' || !seek.rated || !signedIn) return null;
  return poolOfClock(seek.minutes * 60, seek.increment);
}

/** Whether a card of `picks` already plays `seek`: one of the player's own, or a speed's pool. */
export function playedBy(picks: readonly CardPick[], seek: CustomSeek): boolean {
  const pool = poolOfSeek(seek, true);
  const key = seekKey(seek);
  return picks.some(pick =>
    'speed' in pick
      ? pool !== null && POOLS[pick.speed].includes(pool)
      : seeksOf(pick.custom).some(each => seekKey(each) === key),
  );
}

const clockOfPool = (id: string): CustomCard['clocks'][number] => {
  const [minutes = 0, increment = 0] = id.split('+').map(Number);
  return { minutes, increment };
};

/** A card as one of the player's own, to edit: a speed's plays Standard, rated, in its pools. */
export function customOf(pick: CardPick): CustomCard {
  if ('custom' in pick) return pick.custom;
  return { variant: 'standard', rated: true, clocks: POOLS[pick.speed].map(clockOfPool) };
}

/** The card that plays `custom`: a speed's if it's that speed's pools as they are, its last pool played the primary. */
export function pickOf(custom: CustomCard): CardPick {
  const key = pickKey({ custom });
  return DEFAULT_PICKS.find(pick => pickKey({ custom: customOf(pick) }) === key) ?? { custom };
}

export const isDefault = (picks: readonly CardPick[]): boolean =>
  picks.map(pickKey).join() === DEFAULT_PICKS.map(pickKey).join();
