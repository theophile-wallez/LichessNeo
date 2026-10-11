import { describe, expect, it } from 'vitest';
import { DashboardSchema, overview } from './data.ts';
import { DASHBOARD, THEMES } from './fixtures/dashboard.ts';

const names = (themes: readonly { readonly name: string }[]): string[] =>
  themes.map(theme => theme.name);

describe('the overview', () => {
  it('reads Lichess’s answer', () => {
    expect(DashboardSchema.safeParse(JSON.parse(JSON.stringify(DASHBOARD))).success).toBe(true);
    expect(DashboardSchema.safeParse({ days: 30, global: {} }).success).toBe(false);
  });

  it('keeps the period’s numbers, and counts the failed puzzles not solved since', () => {
    expect(overview(DASHBOARD)).toMatchObject({
      days: 30,
      puzzles: 41,
      firstWins: 18,
      level: 2099,
      performance: 2038,
      toReplay: 23,
    });
  });

  it('ranks the themes with 3 puzzles or more by their gap to their level, best first', () => {
    const view = overview(DASHBOARD);
    expect(names(view.themes)).toEqual([
      'Exposed king',
      'Rook endgame',
      'Fork',
      'Endgame',
      'Defensive move',
      'Sacrifice',
    ]);
    expect(view.themes[0]).toMatchObject({ key: 'exposedKing', gap: 500, firstWins: 3 });
    expect(view.fewer).toBe(2);
  });

  it('lists the weakest worst first and the strongest best first, neither the even ones', () => {
    const view = overview(DASHBOARD);
    expect(names(view.weakest)).toEqual(['Sacrifice', 'Defensive move', 'Endgame']);
    expect(names(view.strongest)).toEqual(['Exposed king', 'Rook endgame']);
  });

  it('has nothing to rank when no theme has enough puzzles', () => {
    const view = overview({ ...DASHBOARD, themes: { pin: THEMES.pin } });
    expect(view.themes).toEqual([]);
    expect(view.weakest).toEqual([]);
    expect(view.strongest).toEqual([]);
    expect(view.fewer).toBe(1);
  });
});
