import { type Color, opposite } from '#shared/chess/types.ts';
import { pickBy } from '#page/review/coach/said.ts';
import { sanOf } from '#page/review/chess/notation.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import { forColor } from '#page/review/evaluation/score.ts';
import type { Standing } from '#page/review/i18n/practice-mode-types.ts';
import type { Miss } from '#page/review/practice/state.ts';
import { judged, type Spoken } from './practice-spoken.ts';

// Why a refused move was one: the engine's reply to it, and where that leaves
// the side that replied, once the engine has looked at it. A move only rare in
// the book, that the engine finds fine, has no such reply.

/** A move losing less win chance than this has no punishment worth a word. */
const PUNISHED_LOSS = 5;

/** Where the replying side stands, from its win chance (0 to 100). */
function standingOf(winChance: number): Standing {
  if (winChance >= 85) return 'winning';
  if (winChance >= 70) return 'clearly';
  return winChance >= 58 ? 'better' : 'equal';
}

/** "After h3, d5! and Black is a bit better": null until the engine has judged the move. */
export function refutationWords(spoken: Spoken, miss: Miss): string | null {
  const verdict = judged(spoken, miss.played.path);
  if (!verdict || verdict.loss < PUNISHED_LOSS || !verdict.after.best) return null;
  const { practice, session } = spoken;
  const replier: Color = opposite(practice.side);
  const reply = sanOf(verdict.position.fen, verdict.after.best);
  if (!reply) return null;
  const standing = standingOf(forColor(verdict.after.whiteWinChance, replier));
  const { modes } = session.language.ui.practice;
  const ways = modes.refutation(
    moveToken(miss.played.san, practice.side),
    moveToken(reply, replier),
    standing,
    replier,
  );
  return pickBy(ways, `refute|${miss.played.path}`);
}
