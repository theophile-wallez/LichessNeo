import { afterEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import type { Mode, Session } from '#page/review/session.ts';
import { watchClicks } from './clicks.ts';
import { syncModeTabs } from './mode-tabs.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
});

/** The opera game's review on its tenth move, its tabs drawn in `mode`, its clicks watched. */
function reviewIn(mode: Mode): { readonly session: Session; readonly shown: Mode[] } {
  const { session: judged, ctrl, facade } = judgedGame('opera');
  const shown: Mode[] = [];
  const session: Session = {
    ...judged,
    redraw: () => syncModeTabs(session, facade),
    setMode: next => {
      shown.push(next);
      session.view.mode = next;
    },
  };
  ctrl.jumpToMain(10);
  session.view.mode = mode;
  document.body.append(session.elements.modes);
  watchClicks(session);
  session.redraw();
  return { session, shown };
}

const tabs = ({ elements }: Session): HTMLButtonElement[] =>
  queryAll(elements.modes, '[role="tab"]', HTMLButtonElement);

const tab = ({ elements }: Session, mode: Mode): HTMLElement | null =>
  queryOne(elements.modes, `[role="tab"][data-ln-ext="${mode}"]`, HTMLElement);

const share = ({ elements }: Session): HTMLElement | null =>
  queryOne(elements.modes, '[data-ln-ext="share"]', HTMLElement);

describe('the review’s tabs', () => {
  it('give a game’s three modes a tab each, the one on show picked', () => {
    const { session } = reviewIn('summary');
    expect(tabs(session).map(each => each.textContent)).toEqual(['Summary', 'Debrief', 'Moves']);
    expect(tabs(session).map(each => each.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  it('stay the same buttons from one mode to the next, so that the pick slides', () => {
    const { session } = reviewIn('summary');
    const before = tabs(session);
    session.view.mode = 'normal';
    session.redraw();
    expect(tabs(session)).toEqual(before);
    expect(tabs(session).every((each, i) => each === before[i])).toBe(true);
    expect(tab(session, 'normal')?.classList.contains('active')).toBe(true);
    expect(tab(session, 'summary')?.classList.contains('active')).toBe(false);
  });

  it.each(['summary', 'moves', 'normal'] as const)(
    'carry the share button in the %s mode, not the debrief’s alone',
    mode => {
      expect(share(reviewIn(mode).session)).not.toBeNull();
    },
  );

  it('draw their buttons again only when they change', () => {
    const { session } = reviewIn('moves');
    const first = share(session);
    session.redraw();
    expect(share(session)).toBe(first);
    session.view.sheet = true;
    session.redraw();
    expect(share(session)?.getAttribute('aria-pressed')).toBe('true');
  });

  it('show a mode from its tab, and leave the one on show alone', () => {
    const { session, shown } = reviewIn('moves');
    tab(session, 'moves')?.click();
    expect(shown).toEqual([]);
    tab(session, 'normal')?.click();
    tab(session, 'summary')?.click();
    expect(shown).toEqual(['normal', 'summary']);
  });
});
