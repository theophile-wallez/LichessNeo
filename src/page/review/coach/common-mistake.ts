import { isError } from '#page/review/classes/classes.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { PlayersAt } from '#page/review/theory/players.ts';
import { oneOf } from './said.ts';

// An error many players make in the same position: what Lichess's players
// around the mover's rating play there (theory/players.ts) says how many.

/** Below this, a share says little; above it, the move is a habit, not a slip. */
const MIN_GAMES = 300;
const MIN_SHARE = 0.03;

const bare = (san: string): string => san.replace(/[+#]$/, '');

/** "A classic mistake: 8% of players at this level play it here", or null for a rare or good move. */
export function commonMistake(
  move: MoveVerdict,
  language: ReviewLanguage,
  players: PlayersAt | null,
): string | null {
  if (!players || !isError(move.moveClass)) return null;
  const { data, rated } = players;
  const total = data.white + data.draws + data.black;
  const played = data.moves.find(
    each => each.uci === move.uci || bare(each.san) === bare(move.san),
  );
  if (!played || total < MIN_GAMES) return null;
  const share = (played.white + played.draws + played.black) / total;
  return share < MIN_SHARE ? null : oneOf(language.theory.common(share, rated), move);
}
