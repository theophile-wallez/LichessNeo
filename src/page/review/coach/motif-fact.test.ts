import { describe, expect, it } from 'vitest';
import { playLine } from '#page/review/chess/played-line.ts';
import { LINES } from '#page/review/fixtures/line-motifs.ts';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { mateIdea, type MotifLine, withMotif } from './motif-fact.ts';

const lineOf = ([fen, line]: readonly [string, string], more: Partial<MotifLine> = {}) => {
  const plies = playLine(fen, line.split(' '));
  return { plies, offset: 0, winner: 'white', upTo: plies.length, base: 'a', ...more } as const;
};

describe('withMotif', () => {
  it('draws the tactic after the arrow of its move, as a line’s first', () => {
    const fact = withMotif('White wins the bishop.', lineOf(LINES.interference), en.facts);
    expect(fact.theme).toBe('interference');
    expect(fact.drawing).toEqual({
      topic: 'lines',
      marks: [
        { kind: 'link', from: 'd4', to: 'e6', tone: 'attack' },
        { kind: 'link', from: 'e8', to: 'e4', tone: 'defense' },
        { kind: 'ring', square: 'e6', tone: 'plan' },
        { kind: 'ring', square: 'e4', tone: 'attack' },
      ],
    });
  });

  it('draws it without the arrow when its move is the one played, on the board already', () => {
    const line = lineOf(LINES.interference, { played: true });
    expect(withMotif('White wins the bishop.', line, en.facts).drawing?.marks[0]).toEqual({
      kind: 'link',
      from: 'e8',
      to: 'e4',
      tone: 'defense',
    });
  });

  it('draws nothing of a tactic that comes later in the line', () => {
    const fact = withMotif('White wins the queen.', lineOf(LINES.attraction), en.facts);
    expect(fact.theme).toBe('fork');
    expect(fact).not.toHaveProperty('drawing');
  });
});

// The idea of a line's first move, played, the rest the engine's.
const ideaOf = ([fen, line]: readonly [string, string]) => {
  const [uci = '', ...rest] = line.split(' ');
  return mateIdea(
    played({ fen, uci, before: record(90, [uci]), after: record(90, rest) }),
    en.facts,
  );
};

describe('mateIdea', () => {
  it('draws the x-ray of a piece given up to be taken back through', () => {
    expect(ideaOf(LINES.xray)?.drawing).toEqual([
      { kind: 'link', from: 'h6', to: 'c6', tone: 'defense' },
      { kind: 'ring', square: 'd6', tone: 'attack' },
    ]);
  });

  it('says and draws the king lured onto the square struck next', () => {
    const idea = ideaOf(LINES.attraction);
    expect(idea?.text).toBeTruthy();
    expect(idea?.drawing?.at(-1)).toEqual({ kind: 'ring', square: 'h8', tone: 'attack' });
  });

  it('draws the line a check cleared for the queen', () => {
    expect(ideaOf(LINES.clearance)?.drawing).toEqual([
      { kind: 'run', from: 'd1', squares: ['d2', 'd3', 'd4', 'd5'], tone: 'plan' },
    ]);
  });
});
