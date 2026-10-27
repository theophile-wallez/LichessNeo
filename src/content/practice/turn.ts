import { queryOne } from '#shared/dom.ts';

// Whose turn it is in a practice drill, with its hint and the last move's
// verdict, read from Lichess's drill box (lila's ui/analyse/src/practice), which
// the coach's card shows in its place (turn-row.ts).

const QUALITIES = ['goodMove', 'inaccuracy', 'mistake', 'blunder'] as const;

export type Quality = (typeof QUALITIES)[number];

export interface Turn {
  /** The side played, from the box's king; null once the game is over. */
  readonly color: 'white' | 'black' | null;
  /** "Your turn", or "Computer thinking". */
  readonly status: string;
  /** The hint link's words ("Get a hint", "See best move"…), empty when there is none. */
  readonly hint: string;
  /** "Good move", "Inaccuracy"…, empty before a move. */
  readonly verdict: string;
  /** What follows the verdict: "Another was Rh6+". */
  readonly advice: string;
  readonly quality: Quality | null;
}

const textOf = (node: Node | null): string => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/** The drill box `box`'s turn, or null while it shows none. */
export function readTurn(box: Element): Turn | null {
  const instruction = queryOne(box, '.feedback .instruction', HTMLElement);
  if (!instruction) return null;
  const king = queryOne(box, '.feedback .player piece.king', HTMLElement);
  const comment = queryOne(box, '.comment', HTMLElement);
  const verdict = comment && queryOne(comment, '.verdict', HTMLElement);
  const advice = comment
    ? [...comment.childNodes]
        .filter(node => node !== verdict)
        .map(textOf)
        .join(' ')
    : '';
  return {
    color: king && (king.classList.contains('black') ? 'black' : 'white'),
    status: textOf(queryOne(instruction, 'strong, em', HTMLElement)),
    hint: textOf(queryOne(instruction, '.choices a', HTMLElement)),
    verdict: textOf(verdict),
    advice: advice.replace(/\s+/g, ' ').trim(),
    quality: QUALITIES.find(quality => box.classList.contains(quality)) ?? null,
  };
}
