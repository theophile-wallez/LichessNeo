import { clockLabel, type SeekPerf, type Variant } from '#shared/custom-seek.ts';
import { message } from '#content/platform/runtime.ts';
import { perfOfCard, type CardPick } from '#content/pages/speed-cards/picks.ts';
import { poolLabel, POOLS } from '#content/pages/speed-cards/pools.ts';

// The words the settings' quick pairing says a card with: its name, its rating's, and
// its time controls.

const SPEED_NAMES: Readonly<Record<string, string>> = {
  ultraBullet: 'speedUltraBullet',
  bullet: 'speedBullet',
  blitz: 'speedBlitz',
  rapid: 'speedRapid',
  classical: 'speedClassical',
};

/** `variantKingOfTheHill` for kingOfTheHill. */
export const variantName = (variant: Variant): string =>
  message(`variant${variant.charAt(0).toUpperCase()}${variant.slice(1)}`);

/** The rating a card counts in: its speed's, or its variant's. */
export const perfOfPick = (pick: CardPick): SeekPerf =>
  'speed' in pick ? pick.speed : perfOfCard(pick.custom);

/** A card's name, as the home writes it: its rating's. */
export function pickName(pick: CardPick): string {
  const perf = perfOfPick(pick);
  const speed = SPEED_NAMES[perf];
  if (speed) return message(speed);
  return 'custom' in pick ? variantName(pick.custom.variant) : '';
}

/** "3 min · 3 + 2 · 5 min · 5 + 3", and a card of the player's own's mode. */
export function pickDetail(pick: CardPick): string {
  if ('speed' in pick) return POOLS[pick.speed].map(poolLabel).join(' · ');
  const { clocks, rated } = pick.custom;
  const labels = clocks.map(({ minutes, increment }) => clockLabel(minutes, increment));
  return [...labels, message(rated ? 'pairingRated' : 'pairingCasual')].join(' · ');
}
