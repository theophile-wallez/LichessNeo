import { afterEach, describe, expect, it } from 'vitest';
import { Analysis } from '#page/lichess/analysis.ts';
import { nodeId, playUci } from '#page/review/fixtures/fake-chess.ts';
import { fakeController, type FakeNode } from '#page/review/fixtures/fake-lichess.ts';
import type { LiveState, Review } from '#page/review/session.ts';
import { reviewBadges } from './move-list.ts';

afterEach(() => {
  document.body.replaceChildren();
});

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function branch(parent: FakeNode, uci: string, comp: boolean): FakeNode {
  const { fen, san } = playUci(parent.fen, uci);
  const node: FakeNode = {
    id: nodeId(uci),
    ply: parent.ply + 1,
    fen,
    uci,
    san,
    comp,
    children: [],
  };
  parent.children.push(node);
  return node;
}

const at = (...ucis: string[]): string => ucis.map(nodeId).join('');

const EMPTY_REVIEW: Review = {
  moves: [],
  draft: [],
  total: 0,
  complete: false,
  positions: [],
  accuracy: { white: null, black: null },
  counts: { white: {}, black: {} },
  rating: null,
};

const emptyLive = (): LiveState => ({
  evals: new Map(),
  books: new Map(),
  judged: new Map(),
  busy: false,
  bookBusy: false,
  noBook: false,
  error: null,
  entered: new Set(),
});

/**
 * 1. e4 e5, with two computer lines in place of 1... e5: 1... c5, and 1... d5, which the user
 * played on from with 2. Nc3.
 */
function page(): Analysis {
  const e4 = playUci(START, 'e2e4');
  const ctrl = fakeController({
    id: 'abcdefgh',
    positions: [
      { ply: 0, fen: START },
      { ply: 1, fen: e4.fen, uci: 'e2e4', san: e4.san },
    ],
  });
  const first = ctrl.tree.root.children[0];
  if (!first) throw new Error('no first move');
  branch(first, 'e7e5', false);
  branch(first, 'c7c5', true);
  branch(branch(first, 'd7d5', true), 'b1c3', false);
  document.body.innerHTML = `<main class="analyse"><div class="tview2">
    <move p="${at('e2e4')}">e4</move><move p="${at('e2e4', 'e7e5')}">e5</move>
    <interrupt><lines>
      <line><move p="${at('e2e4', 'c7c5')}">c5</move></line>
      <line><move p="${at('e2e4', 'd7d5')}">d5</move>
        <lines><line><move p="${at('e2e4', 'd7d5', 'b1c3')}">Nc3</move></line></lines>
      </line>
    </lines></interrupt>
  </div></main>`;
  return new Analysis(ctrl);
}

const lineOf = (san: string): Element | null | undefined =>
  [...document.querySelectorAll('move')].find(move => move.textContent === san)?.closest('line');

describe('reviewBadges', () => {
  it('marks the variations played, and the computer lines they branch off', () => {
    reviewBadges(emptyLive(), page(), EMPTY_REVIEW);
    expect(lineOf('Nc3')?.className).toBe('ln-ext-var');
    expect(lineOf('d5')?.className).toBe('ln-ext-var-host');
    expect(lineOf('c5')?.className).toBe('');
  });

  it('takes a computer line the user stepped into as theirs, once left too', () => {
    const live = emptyLive();
    const analysis = page();
    analysis.userJump(at('e2e4', 'c7c5'));
    reviewBadges(live, analysis, EMPTY_REVIEW);
    expect(lineOf('c5')?.className).toBe('ln-ext-var');
    analysis.userJump(at('e2e4', 'e7e5'));
    reviewBadges(live, analysis, EMPTY_REVIEW);
    expect(lineOf('c5')?.className).toBe('ln-ext-var');
  });
});
