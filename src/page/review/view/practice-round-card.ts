import type { BlitzCard } from '#page/review/practice/blitz.ts';
import type { GameDrill } from '#page/review/practice/games.ts';
import type { Entry } from '#page/review/practice/repertoire.ts';
import type { Trap } from '#page/review/practice/traps.ts';
import type { Session } from '#page/review/session.ts';

// The card of practice's round on the board, by its kind, for the coach to
// speak of it.

export type RoundCard =
  | { readonly kind: 'review'; readonly entry: Entry }
  | { readonly kind: 'blitz'; readonly card: BlitzCard }
  | { readonly kind: 'trap'; readonly trap: Trap }
  | { readonly kind: 'games'; readonly drill: GameDrill };

export function roundCard(session: Session): RoundCard | null {
  const { round } = session.view;
  if (!round) return null;
  if (round.kind === 'review') {
    const entry = round.cards[round.index];
    return entry ? { kind: 'review', entry } : null;
  }
  if (round.kind === 'blitz') {
    const card = round.cards[round.index];
    return card ? { kind: 'blitz', card } : null;
  }
  if (round.kind === 'trap') {
    const trap = round.cards[round.index];
    return trap ? { kind: 'trap', trap } : null;
  }
  const drill = round.cards[round.index];
  return drill ? { kind: 'games', drill } : null;
}
