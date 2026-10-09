import { afterEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import { UNIT_CASES } from '#page/review/fixtures/unit-cases.ts';
import { builtSession } from '#page/review/fixtures/unit-review.ts';
import type { Mode, Session } from '#page/review/session.ts';
import { watchClicks } from './clicks.ts';
import { renderSummary } from './summary-panel.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

interface Summary {
  readonly session: Session;
  readonly analysis: Analysis;
  readonly modes: Mode[];
}

/** The summary of a review built through `build`, with its clicks watched. */
function summaryOf(build: (typeof UNIT_CASES.builds)[number]): Summary {
  const modes: Mode[] = [];
  const session = { ...builtSession(build), setMode: (mode: Mode) => void modes.push(mode) };
  const analysis = pageAnalysis();
  if (!analysis) throw new Error('no analysis');
  document.body.append(session.elements.panel);
  renderSummary(session, analysis);
  watchClicks(session);
  return { session, analysis, modes };
}

const countButton = (session: Session, color: string, moveClass: string): HTMLElement | null =>
  queryOne(
    session.elements.panel,
    `[data-lr-ext="jump"][data-lr-ext-color="${color}"][data-lr-ext-class="${moveClass}"]`,
    HTMLElement,
  );

describe('the summary’s counts', () => {
  const [complete, partial] = UNIT_CASES.builds;
  if (!complete || !partial) throw new Error('missing build cases');

  it('go to the player’s moves of their class, one after the other, round again', () => {
    const { session, analysis, modes } = summaryOf(complete);
    const moves = session.view.review?.moves ?? [];
    const plies = moves.flatMap(move =>
      move?.color === 'white' && move.moveClass === 'best' ? [move.ply] : [],
    );
    expect(plies.length).toBeGreaterThan(1);
    const button = countButton(session, 'white', 'best');
    if (!button) throw new Error('no button for White’s best moves');
    expect(button.getAttribute('aria-label')).toBe(`White’s best moves: ${plies.length}`);
    const visited: number[] = [];
    for (let i = 0; i <= plies.length; i++) {
      button.click();
      visited.push(analysis.node.ply);
    }
    expect(visited).toEqual([...plies, plies[0]]);
    expect(modes).toEqual(Array(plies.length + 1).fill('moves'));
  });

  it('go on from the move on the board, wherever the user stepped to', () => {
    const { session, analysis } = summaryOf(complete);
    const plies = (session.view.review?.moves ?? []).flatMap(move =>
      move?.color === 'white' && move.moveClass === 'best' ? [move.ply] : [],
    );
    const [first, second, third] = plies;
    if (first === undefined || second === undefined || third === undefined)
      throw new Error('too few best moves for White');
    const button = countButton(session, 'white', 'best');
    if (!button) throw new Error('no button for White’s best moves');
    button.click();
    expect(analysis.node.ply).toBe(first);
    analysis.jumpToMain(second);
    button.click();
    expect(analysis.node.ply).toBe(third);
    analysis.jumpToMain(analysis.mainline.length - 1);
    button.click();
    expect(analysis.node.ply).toBe(first);
  });

  it('are plain numbers when zero, or until every move is judged at full depth', () => {
    const { session } = summaryOf(complete);
    const buttons = queryAll(session.elements.panel, '[data-lr-ext="jump"]', HTMLButtonElement);
    expect(buttons.map(button => Number(button.textContent))).not.toContain(0);
    expect(buttons.length).toBe(
      queryAll(session.elements.panel, '.lr-ext-t-num', HTMLElement).filter(
        cell => Number(cell.textContent) > 0,
      ).length,
    );
    document.body.replaceChildren();
    const unfinished = summaryOf(partial).session;
    expect(unfinished.view.review?.complete).toBe(false);
    expect(queryAll(unfinished.elements.panel, '[data-lr-ext="jump"]', Element)).toHaveLength(0);
  });
});
