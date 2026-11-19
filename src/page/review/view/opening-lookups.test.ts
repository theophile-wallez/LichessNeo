import { afterEach, describe, expect, it, vi } from 'vitest';
import { takeTestTheory } from '#page/review/fixtures/theory.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { lookUpOpening, lookupsKey } from './opening-lookups.ts';
import { renderKey } from './render-key.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

/** The opera fixture's review, on its first move, 1. e4. */
function onFirstMove() {
  const game = judgedGame('opera');
  game.session.view.mode = 'moves';
  game.ctrl.jump(game.ctrl.mainline[1]?.id ?? '');
  return game;
}

describe('the opening’s lookups', () => {
  it('draw the panel again once the theory of the move on show is in', () => {
    const { session, facade } = onFirstMove();
    const before = renderKey(session, facade);
    expect(lookupsKey(session, facade)).toBe('false,false');
    takeTestTheory();
    expect(lookupsKey(session, facade)).toBe('true,false');
    expect(renderKey(session, facade)).not.toBe(before);
  });

  it('read the language’s study in opening practice too', () => {
    const fetched = vi.fn<(url: string) => Promise<Response>>(async () => new Response(''));
    vi.stubGlobal('fetch', fetched);
    const { session, facade } = onFirstMove();
    session.view.mode = 'openings';
    lookUpOpening(session, facade);
    expect(fetched.mock.calls[0]?.[0]).toContain(`/api/study/${session.language.theory.study}.pgn`);
  });
});
