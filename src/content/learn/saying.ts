import { queryOne } from '#shared/dom.ts';
import type { Saying } from '#content/coach/card.ts';

// What the coach says on a Learn stage's panel, read from Lichess's: the
// level's goal, or how it ended (lila's ui/learn/src/run/runView.ts).

// Lichess breaks the goal in lines for its narrow panel: in the bubble, it wraps by itself.
const lineText = (element: Element): string =>
  [...element.childNodes]
    .map(node => (node instanceof HTMLBRElement ? ' ' : (node.textContent ?? '')))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

/** The coach's words for the panel `table`, or null while it shows none. */
export function readSaying(table: Element): Saying | null {
  // The level's pill: two levels may share a goal.
  const level =
    queryOne(table, '.progress a.active', HTMLAnchorElement)?.getAttribute('href') ?? '';
  const goal = queryOne(table, '.goal', HTMLElement);
  if (goal) {
    const text = lineText(goal);
    return text ? { key: `goal ${level} ${text}`, text, mood: 'neutral' } : null;
  }
  const result = queryOne(table, '.result', HTMLElement);
  const title = result && queryOne(result, 'h2', HTMLElement);
  if (!result || !title) return null;
  // Lichess picks its congratulations anew on each redraw: the first one is kept.
  const failed = result.classList.contains('failed');
  return {
    key: `${failed ? 'failed' : 'completed'} ${level}`,
    text: lineText(title),
    mood: failed ? 'worry' : 'delight',
  };
}
