import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { markPhaseRows } from './move-list-phases.ts';

afterEach(() => {
  document.body.replaceChildren();
});

// Lichess's move list of six moves, a comment after 2. Nf3 leaving its "2..." row.
const LIST = `<main class="analyse"><div class="tview2 tview2-column">
<index>1</index><move p="a">e4</move><move p="b">e5</move>
<index>2</index><move p="c">Nf3</move><interrupt><comment>Develops.</comment></interrupt><index>2</index><move class="empty">...</move><move p="d">Nc6</move>
<index>3</index><move p="e">Bb5</move><move p="f">a6</move>
</div></main>`;

const named = (): string[] =>
  queryAll(document, '.tview2 > index', HTMLElement).map(
    index => `${index.textContent}:${index.dataset.lnExtPhase ?? ''}`,
  );

describe('markPhaseRows', () => {
  it('names the row of each phase’s first move, and the opening’s first', () => {
    document.body.innerHTML = LIST;
    // The middlegame from the position after 1... e5, the endgame after 2... Nc6.
    markPhaseRows({ middle: 2, end: 4 });
    expect(named()).toEqual(['1:Opening', '2:Middlegame', '2:', '3:Endgame']);
  });

  it('heads the row of White’s move when the phase starts at Black’s, past a comment', () => {
    document.body.innerHTML = LIST;
    markPhaseRows({ middle: 3, end: -1 });
    expect(named()).toEqual(['1:Opening', '2:Middlegame', '2:', '3:']);
  });

  it('names nothing in a game that never leaves the opening, and takes names off', () => {
    document.body.innerHTML = LIST;
    markPhaseRows({ middle: 4, end: -1 });
    markPhaseRows({ middle: -1, end: -1 });
    expect(named()).toEqual(['1:', '2:', '2:', '3:']);
  });
});
