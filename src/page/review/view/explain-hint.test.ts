import { afterEach, describe, expect, it } from 'vitest';
import { isError } from '#page/review/classes/classes.ts';
import { takeTestTheory } from '#page/review/fixtures/theory.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { explainHint } from './explain-hint.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

describe('Explain’s lines', () => {
  it('make each move playable, along its line up to itself', () => {
    const { session, ctrl } = judgedGame('opera');
    const move = session.view.review?.moves.find(
      judged => judged && isError(judged.moveClass) && judged.best && judged.after.best,
    );
    if (!move?.best || !move.after.best) throw new Error('no error with lines');
    // The game's next moves stand in for the engine's: the lines are only written out.
    const [reply = '', answer = ''] = ctrl.mainline.slice(move.ply + 1).map(node => node.uci);
    const best = [move.best, reply];
    const punishment = [move.after.best, answer];
    session.lines.found.set(`${move.previousPosition.fen} ${move.best}`, best);
    session.lines.found.set(`${move.position.fen} ${move.after.best}`, punishment);
    const text = explainHint(session, move)
      .map(part => part.text)
      .join(' ');
    expect(text).toContain(`@b:${best[0]}]]`);
    expect(text).toContain(`@b:${best.join(',')}]]`);
    expect(text).toContain(`@b:${move.uci}]]`);
    expect(text).toContain(`@a:${punishment[0]}]]`);
    expect(text).toContain(`@a:${punishment.join(',')}]]`);
  });

  it('make the best move playable while the engine plays its line out', () => {
    const { session } = judgedGame('opera');
    const move = session.view.review?.moves.find(
      judged => judged?.moveClass === 'mistake' && judged.best,
    );
    if (!move?.best) throw new Error('no mistake');
    const [part] = explainHint(session, move);
    expect(part?.text).toContain(`@b:${move.best}]]`);
  });
});

describe('Explain on a book move', () => {
  it('adds nothing where the comment explains the theory, else names the opening', () => {
    takeTestTheory();
    const { session } = judgedGame('opera');
    const [e4, e5] = session.view.review?.moves ?? [];
    if (e4?.moveClass !== 'book' || e5?.moveClass !== 'book') throw new Error('no book moves');
    session.view.openingName = 'Philidor Defense';
    // The test theory explains 1. e4 e5, but no position after it.
    session.work.bookPly = e5.ply;
    expect(explainHint(session, e5)).toEqual([]);
    const nf3 = session.view.review?.moves[2];
    if (nf3?.moveClass !== 'book') throw new Error('no third book move');
    session.work.bookPly = nf3.ply;
    expect(explainHint(session, nf3).map(part => part.text)).toEqual(['Philidor Defense']);
  });
});
