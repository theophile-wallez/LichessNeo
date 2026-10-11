import { describe, expect, it } from 'vitest';
import { coachTips } from './coach-line.ts';
import { overview } from './data.ts';
import { DASHBOARD, THEMES } from './fixtures/dashboard.ts';

const said = (data = DASHBOARD): string[] =>
  coachTips(overview(data)).map(tip => `${tip.lead.name}:${tip.mood}`);

describe('the coach’s tips', () => {
  it('start with the gist, then the best theme, the worst, the pace and the replays', () => {
    expect(said()).toEqual([
      'pdashCoachMixed:neutral',
      'pdashCoachBest:delight',
      'pdashCoachWorst:doubt',
      'pdashCoachReplay:happy',
    ]);
    const [gist] = coachTips(overview(DASHBOARD));
    expect(gist?.lead.values).toEqual(['Exposed king', 'Sacrifice']);
    expect(gist?.body.values).toEqual(['Exposed king', '500', 'Sacrifice', '300']);
  });

  it('tell an easy period from a hard one, once enough puzzles are played', () => {
    const easy = { ...DASHBOARD, global: { ...DASHBOARD.global, firstWins: 30 } };
    expect(said(easy)).toContain('pdashCoachEasy:delight');
    const hard = { ...DASHBOARD, global: { ...DASHBOARD.global, firstWins: 10 } };
    expect(said(hard)).toContain('pdashCoachHard:doubt');
    const few = { ...DASHBOARD, global: { ...DASHBOARD.global, nb: 5, firstWins: 1 } };
    expect(said(few).some(tip => tip.startsWith('pdashCoachHard'))).toBe(false);
  });

  it('say what they can when every theme sits on one side', () => {
    const { exposedKing, rookEndgame } = THEMES;
    const strong = { ...DASHBOARD, themes: { exposedKing, rookEndgame } };
    expect(said(strong)[0]).toBe('pdashCoachStrong:happy');
    const { sacrifice } = THEMES;
    expect(said({ ...DASHBOARD, themes: { sacrifice } })[0]).toBe('pdashCoachWeak:worry');
  });

  it('wait for more puzzles before judging, and leave out the replays when there are none', () => {
    const early = {
      ...DASHBOARD,
      global: { ...DASHBOARD.global, firstWins: 41 },
      themes: { pin: THEMES.pin },
    };
    expect(said(early)).toEqual(['pdashCoachEarly:neutral', 'pdashCoachEasy:delight']);
  });
});
