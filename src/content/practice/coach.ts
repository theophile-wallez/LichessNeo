import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { type CoachCard, ownCoachCard } from '#content/coach/card.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { readExercise, readSaying } from './saying.ts';
import { readTurn } from './turn.ts';
import { buildTurnRow, type TurnRow } from './turn-row.ts';

// A practice drill's coach (styles/practice-run/drill.css): at the top of the
// goal's card, under the exercise's place in the lesson, it says the goal in
// the Game Review's coach card, then cheers or comforts as the exercise ends.
// Under its words, the drill box's turn and hint, the box itself out of sight.

const BOX = 'main.analyse .practice-box';

const ownCard = ownCoachCard('ln-ext-practice-coach');
let turnRow: { readonly card: CoachCard; readonly row: TurnRow } | null = null;

function showTurn(row: TurnRow): void {
  const box = queryOne(document, BOX, HTMLElement);
  row.show(box && readTurn(box));
}

// Lichess redraws the box as the click's handler ends: the row follows at once.
function clickHint(): void {
  queryOne(document, `${BOX} .choices a`, HTMLElement)?.click();
  if (turnRow) showTurn(turnRow.row);
}

function rowOf(card: CoachCard): TurnRow {
  if (turnRow?.card === card) return turnRow.row;
  const row = buildTurnRow(clickHint);
  card.bubble.append(row.root);
  turnRow = { card, row };
  return row;
}

function sync(missed: string): void {
  const side = queryOne(document, 'main.analyse .practice__side', HTMLElement);
  const underboard = side && queryOne(document, 'main.analyse .analyse__underboard', HTMLElement);
  const exercise = side && readExercise(side);
  if (!underboard || !exercise) return;
  const saying = readSaying(underboard, { exercise: exercise.id, missed });
  if (!saying) return;
  const card = ownCard(underboard);
  if (card.kicker.textContent !== exercise.label) card.kicker.textContent = exercise.label;
  card.say(saying);
  showTurn(rowOf(card));
}

export const practiceCoach: Feature = {
  name: 'practice coach',
  start: () => {
    const missed = message('practiceMissed');
    onEveryTick('practice coach', () => sync(missed));
  },
};
