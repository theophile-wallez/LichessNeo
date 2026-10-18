import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import type { Mode, Session } from '#page/review/session.ts';
import { watchClicks } from './clicks.ts';
import { keepAvatar, watchCoachPicks } from './coach-avatar.ts';
import { renderMoves } from './moves-panel.ts';

const stops: (() => void)[] = [];

afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

// happy-dom's messages come from its own window object, not the test's: hand them over.
function relayMessages(): unknown[] {
  const posted: unknown[] = [];
  vi.spyOn(window, 'postMessage').mockImplementation((data: unknown) => {
    posted.push(data);
    window.dispatchEvent(new MessageEvent('message', { data, source: window }));
  });
  return posted;
}

/** The opera game's move-by-move panel on its fifth move, its coach the first. */
function reviewIn(mode: Mode): { session: Session; redraws: () => number } {
  const { session: judged, ctrl, facade } = judgedGame('opera');
  ctrl.jumpToMain(5);
  judged.view.mode = mode;
  const draw = (): void => {
    renderMoves(session, facade);
    keepAvatar(session);
  };
  let redraws = 0;
  const session: Session = {
    ...judged,
    redraw: () => {
      redraws++;
      draw();
    },
  };
  document.body.append(session.elements.panel);
  draw();
  watchClicks(session);
  stops.push(watchCoachPicks(session));
  return { session, redraws: () => redraws };
}

const pick = (coach: number): void => {
  window.dispatchEvent(
    new MessageEvent('message', { data: { type: 'ln-ext:coach-picked', coach }, source: window }),
  );
};

describe('the review’s coach', () => {
  it('opens the coach picker on a click, on the coach that shows', () => {
    const posted = relayMessages();
    const { session } = reviewIn('moves');
    queryOne(session.elements.panel, '.ln-ext-coach__avatar', HTMLElement)?.click();
    expect(posted).toContainEqual({ type: 'ln-ext:coach-picker', coach: 1 });
    expect(session.coach.id).toBe(1);
  });

  it('takes the coach picked, and words the comment its own way', () => {
    const posted = relayMessages();
    const { session, redraws } = reviewIn('moves');
    pick(4);
    expect(session.coach.id).toBe(4);
    expect(session.coach.avatar?.dataset.lnExtCoachId).toBe('4');
    expect(redraws()).toBe(1);
    expect(posted).toContainEqual(expect.objectContaining({ type: 'ln-ext:coach', coach: 4 }));
  });

  it('draws nothing again for the coach it already shows, nor in the summary', () => {
    const moves = reviewIn('moves');
    pick(1);
    expect(moves.redraws()).toBe(0);
    for (const stop of stops.splice(0)) stop();
    const summary = reviewIn('summary');
    pick(2);
    expect(summary.session.coach.id).toBe(2);
    expect(summary.redraws()).toBe(0);
  });
});
