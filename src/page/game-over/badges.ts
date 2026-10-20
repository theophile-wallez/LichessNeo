import type { BoardCell } from '#shared/chess/squares.ts';
import { COLORS, type Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import type { EndReason, Outcome } from './outcome.ts';
import { ICONS, type IconName } from './icons.ts';
import type { GameOverTexts } from './texts.ts';

// The kings' badges once the game is over: the winner's square green under a
// crown and "Winner", the loser's red under how they lost, both grey for a
// draw (styles/game/game-end.css).

type BadgeKind = 'win' | 'loss' | 'draw';

export interface KingBadge {
  readonly kind: BadgeKind;
  readonly icon: IconName;
  readonly label: string;
}

/** How the game was lost, on the loser's king. */
const LOSS_ICONS: Readonly<Record<EndReason, IconName>> = {
  mate: 'mate',
  resign: 'flag',
  time: 'clock',
  left: 'flag',
  stalemate: 'half',
  draw: 'half',
  other: 'cross',
};

/** Each king's badge for the outcome. */
export function kingBadges(outcome: Outcome, texts: GameOverTexts): Record<Color, KingBadge> {
  const { winner, reason } = outcome;
  const badge = (color: Color): KingBadge => {
    if (winner === null) {
      const label = reason === 'stalemate' ? texts.kingLabels.stalemate : texts.drawLabel;
      return { kind: 'draw', icon: 'half', label };
    }
    if (color === winner) return { kind: 'win', icon: 'crown', label: texts.winner };
    return { kind: 'loss', icon: LOSS_ICONS[reason], label: texts.kingLabels[reason] };
  };
  return { white: badge('white'), black: badge('black') };
}

const EDGES: ReadonlyMap<number, string> = new Map([
  [0, ' ln-ext-end__king--start'],
  [7, ' ln-ext-end__king--end'],
]);

export function badgesMarkup(
  badges: Record<Color, KingBadge>,
  cells: Readonly<Partial<Record<Color, BoardCell>>>,
): SafeHtml {
  const items = COLORS.map(color => {
    const cell = cells[color];
    if (!cell) return '';
    const { kind, icon, label } = badges[color];
    // The label goes under the square on the top row, and is held in on the side
    // files, where it would leave the board.
    const below = cell.row === 0 ? ' ln-ext-end__king--below' : '';
    const edge = EDGES.get(cell.column) ?? '';
    return html`<div class="ln-ext-end__king ln-ext-end__king--${kind}${below}${edge}" style="--column:${cell.column};--row:${cell.row}">
      <span class="ln-ext-end__king-icon">${ICONS[icon]}</span>
      <span class="ln-ext-end__king-label">${label}</span>
    </div>`;
  });
  return html`${items}`;
}
