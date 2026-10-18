import { afterEach, describe, expect, it } from 'vitest';
import { parseScore, scoreWords, syncScores } from './simul-scores.ts';

// A host's simuls as Lichess serves them (lila's simul/ui hostedByUser), then its pager.
const ROW = (score: string): string => `<tr class="paginated">
  <td class="icon"><icon data-icon=""></icon></td>
  <td class="name"><a href="/simul/abc">Coach simul</a></td>
  <td><span class="color-icon is random text">5+3</span><br><time>2 hours ago</time></td>
  <td>${score}</td>
</tr>`;

function page(head: string, rows: readonly string[]): void {
  document.body.innerHTML = `<main class="page-small box simul-list"><table class="slist">
    <thead><tr><th class="count">7528</th><th colspan="2"><h1>Lance5500 simuls</h1></th><th>${head}</th></tr></thead>
    <tbody class="infinite-scroll">${rows.join('')}<tr class="pager"><th><a rel="next">Next</a></th></tr></tbody>
  </table></main>`;
}

// As the infinite scroll does: a row parsed apart, added to the list.
function addRow(score: string): void {
  const table = document.createElement('table');
  table.innerHTML = `<tbody>${ROW(score)}</tbody>`;
  const row = table.rows[0];
  if (row) document.querySelector('main tbody')?.prepend(row);
}

const numbers = (row: Element | undefined): (string | null | undefined)[][] =>
  [...(row?.querySelectorAll<HTMLElement>('.ln-ext-simul-score > b') ?? [])].map(number => [
    number.textContent,
    number.dataset['lnExtLabel'],
    number.getAttribute('title'),
  ]);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('a host’s simul scores', () => {
  it('reads a score and the column’s words', () => {
    expect(parseScore(' 10 / 1 / 4 ')).toEqual({ wins: 10, draws: 1, losses: 4 });
    expect(parseScore('10 / 1')).toBeNull();
    expect(scoreWords('Victoires/Nulles/Défaites')).toEqual(['Victoires', 'Nulles', 'Défaites']);
    expect(scoreWords('Score')).toBeNull();
  });

  it('shows each result with its initial, and the shares for the bar', () => {
    page('Wins/Draws/Losses', [ROW('10 / 1 / 4')]);
    syncScores();
    const row = document.querySelector<HTMLElement>('tr.paginated') ?? undefined;
    expect(numbers(row)).toEqual([
      ['10', 'W', 'Wins'],
      ['1', 'D', 'Draws'],
      ['4', 'L', 'Losses'],
    ]);
    expect(row?.style.getPropertyValue('--ln-ext-wins')).toBe('66.7%');
    expect(row?.style.getPropertyValue('--ln-ext-draws')).toBe('6.7%');
    expect(row?.dataset['lnExtScore']).toBe('yes');
  });

  it('marks each row once, and the rows the infinite scroll adds', () => {
    page('Wins/Draws/Losses', [ROW('3 / 0 / 1')]);
    syncScores();
    syncScores();
    addRow('0 / 0 / 0');
    syncScores();
    const rows = [...document.querySelectorAll<HTMLElement>('tr.paginated')];
    expect(rows.map(row => row.querySelectorAll('.ln-ext-simul-score').length)).toEqual([1, 1]);
    expect(rows[0]?.style.getPropertyValue('--ln-ext-wins')).toBe('0%');
    expect(document.querySelector<HTMLElement>('tr.pager')?.dataset['lnExtScore']).toBe('no');
  });

  it('leaves out the initials when the head can’t be split, and the home’s list alone', () => {
    page('Score', [ROW('2 / 1 / 0')]);
    syncScores();
    expect(numbers(document.querySelector('tr.paginated') ?? undefined)).toEqual([
      ['2', undefined, null],
      ['1', undefined, null],
      ['0', undefined, null],
    ]);
    document.querySelector('main')?.classList.replace('page-small', 'page-menu');
    addRow('5 / 0 / 0');
    syncScores();
    expect(
      document.querySelector<HTMLElement>('tr.paginated')?.dataset['lnExtScore'],
    ).toBeUndefined();
  });
});
