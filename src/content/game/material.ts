import { colorLetter, PIECE_VALUES, ROLE_LETTERS } from '#shared/chess/pieces.ts';
import { opposite, type Color, type Role } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { pieceGlyph } from '#shared/piece-glyph.ts';

// Captured pieces under each player's name: the opponent's pieces that are
// no longer on the board, grouped by type, then the lead in material.

export type CapturableRole = Exclude<Role, 'king'>;
export type BarSide = 'top' | 'bottom';

export const CAPTURABLE_ROLES: readonly CapturableRole[] = [
  'pawn',
  'knight',
  'bishop',
  'rook',
  'queen',
];

type Army = Readonly<Record<CapturableRole, number>>;

const START: Army = { pawn: 8, knight: 2, bishop: 2, rook: 2, queen: 1 };
const NOTHING: Army = { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 };
// Variants that start with other pieces. Crazyhouse shows no captured pieces:
// they change sides into the pockets, which show them.
const VARIANT_START = new Map<string, Readonly<Record<Color, Army>>>([
  ['racingKings', { white: { ...START, pawn: 0 }, black: { ...START, pawn: 0 } }],
  ['horde', { white: { pawn: 36, knight: 0, bishop: 0, rook: 0, queen: 0 }, black: START }],
]);

export interface MaterialPiece {
  readonly color: Color;
  readonly role: CapturableRole;
}

export interface CapturedInput {
  /** The pieces on the board, kings aside. */
  readonly pieces: readonly MaterialPiece[];
  /** The color at the bottom of the board. */
  readonly bottom: Color;
  readonly variant: string | undefined;
  /** Three-check: the checks each bar's player gave, shown as kings. */
  readonly checks: Readonly<Record<BarSide, number>>;
  /** Only the checks: the pieces taken and the lead aren't to be shown. */
  readonly checksOnly?: boolean;
}

export type CapturedMarkup = Readonly<Record<BarSide, SafeHtml>>;

function countArmy(pieces: readonly MaterialPiece[], color: Color): Army {
  const army: Record<CapturableRole, number> = { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 };
  for (const piece of pieces) if (piece.color === color) army[piece.role] += 1;
  return army;
}

function countMissing(start: Army, onBoard: Army): Army {
  const missing: Record<CapturableRole, number> = { ...start };
  for (const role of CAPTURABLE_ROLES) missing[role] = Math.max(0, start[role] - onBoard[role]);
  return missing;
}

const materialOf = (army: Army): number =>
  CAPTURABLE_ROLES.reduce((sum, role) => sum + army[role] * PIECE_VALUES[role], 0);

function group(color: Color, role: Role, count: number): SafeHtml {
  const piece = pieceGlyph(`${colorLetter(color)}${ROLE_LETTERS[role]}`);
  return html`<div class="ln-ext-captured__group">${Array.from({ length: count }, () => piece)}</div>`;
}

interface RowOptions {
  /** The color of the pieces shown: the other player's. */
  readonly color: Color;
  readonly missing: Army;
  readonly lead: number;
  readonly checks: number;
}

function rowMarkup({ color, missing, lead, checks }: RowOptions): SafeHtml {
  const groups = CAPTURABLE_ROLES.filter(role => missing[role] > 0).map(role =>
    group(color, role, missing[role]),
  );
  const kings = checks > 0 && group(color, 'king', checks);
  const score = lead > 0 && html`<span class="ln-ext-captured__score">+${lead}</span>`;
  return html`${groups}${kings}${score}`;
}

/** Both bars' captured pieces: each shows the pieces of the other color that are gone. */
export function capturedMarkup(input: CapturedInput): CapturedMarkup {
  if (input.variant === 'crazyhouse') return { top: html``, bottom: html`` };
  const { pieces, bottom, variant, checks, checksOnly = false } = input;
  const top = opposite(bottom);
  const armies = { white: countArmy(pieces, 'white'), black: countArmy(pieces, 'black') };
  const row = (color: Color, lead: number, given: number): SafeHtml => {
    const start = VARIANT_START.get(variant ?? '')?.[color] ?? START;
    const missing = checksOnly ? NOTHING : countMissing(start, armies[color]);
    return rowMarkup({ color, missing, lead: checksOnly ? 0 : lead, checks: given });
  };
  const topMaterial = materialOf(armies[top]);
  const bottomMaterial = materialOf(armies[bottom]);
  return {
    top: row(bottom, topMaterial - bottomMaterial, checks.top),
    bottom: row(top, bottomMaterial - topMaterial, checks.bottom),
  };
}
