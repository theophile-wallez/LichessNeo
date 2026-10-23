import { afterEach, describe, expect, it } from 'vitest';
import { html } from '#shared/html.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { en } from '#page/review/i18n/en.ts';
import { fr } from '#page/review/i18n/fr.ts';
import { fillAroundNav, type NavInput, type NavState, navState, syncNav } from './nav.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

/** Which buttons the opera game leaves enabled on its move `ply`, as the panel shows it. */
function enabledOn(ply: number, input: Partial<NavInput> = {}): Record<keyof NavState, boolean> {
  const { session, ctrl, facade } = judgedGame('opera');
  ctrl.jumpToMain(ply);
  const move = session.view.review?.moves[ply - 1] ?? null;
  const state = navState(session, facade, {
    line: null,
    move,
    shown: null,
    retried: null,
    ...input,
  });
  return {
    explain: state.explain.enabled,
    best: state.best.enabled,
    retry: state.retry.enabled,
    next: state.next.enabled,
  };
}

describe('the nav’s buttons', () => {
  it('fold Explain, Best and Retry away on a best move, which they’d have nothing to add to', () => {
    expect(enabledOn(13)).toEqual({ explain: false, best: false, retry: false, next: true });
  });

  it('keep all three on an error, to show the better move and the lines, or look for it', () => {
    expect(enabledOn(25)).toEqual({ explain: true, best: true, retry: true, next: true });
  });

  it('keep Explain alone on a book move that names its opening', () => {
    expect(enabledOn(9)).toEqual({ explain: true, best: false, retry: false, next: true });
    expect(enabledOn(8)).toEqual({ explain: false, best: false, retry: false, next: true });
  });

  it('leave Retry and Next while the player retries, even on the game’s last move', () => {
    const retried = { kind: 'waiting' } as const;
    expect(enabledOn(25, { retried })).toEqual({
      explain: false,
      best: false,
      retry: true,
      next: true,
    });
    expect(enabledOn(33).next).toBe(false);
    expect(enabledOn(33, { retried }).next).toBe(true);
  });

  it('light Retry up while the player retries, so it reads as the way back', () => {
    const { session, ctrl, facade } = judgedGame('opera');
    ctrl.jumpToMain(25);
    const move = session.view.review?.moves[24] ?? null;
    const input = { line: null, move, shown: null, retried: null };
    expect(navState(session, facade, input).retry.on).toBe(false);
    const retried = { kind: 'waiting' } as const;
    expect(navState(session, facade, { ...input, retried }).retry.on).toBe(true);
  });
});

const state = (enabled: boolean): NavState => ({
  explain: { on: true, enabled },
  best: { on: false, enabled },
  retry: { on: false, enabled },
  next: { enabled: true },
});

describe('the kept nav', () => {
  it('stays the same element, last in the panel, as the panel is filled again', () => {
    const panel = document.createElement('div');
    const nav = document.createElement('div');
    fillAroundNav(panel, html`<p>one</p><p>two</p>`, nav);
    fillAroundNav(panel, html`<p>three</p>`, nav);
    expect([...panel.children].map(child => child.textContent)).toEqual(['three', '']);
    expect(panel.lastElementChild).toBe(nav);
  });

  it('keeps a part drawn the same, and draws again only the parts that changed', () => {
    const panel = document.createElement('div');
    const nav = document.createElement('div');
    fillAroundNav(panel, html`<header>title</header><p>one</p><p>two</p>`, nav);
    const [header, one, two] = panel.children;
    fillAroundNav(panel, html`<header>title</header><p>three</p>`, nav);
    const [keptHeader, three, last] = panel.children;
    expect(keptHeader).toBe(header);
    expect(three).not.toBe(one);
    expect(three?.textContent).toBe('three');
    expect(last).toBe(nav);
    expect(two?.isConnected).toBe(false);
    expect(panel.children).toHaveLength(3);
  });

  it('changes its buttons in place, and draws them again only for another language', () => {
    const nav = document.createElement('div');
    syncNav(nav, state(true), en.ui);
    const explain = nav.querySelector('[data-ln-ext="explain"]');
    syncNav(nav, state(false), en.ui);
    expect(nav.querySelector('[data-ln-ext="explain"]')).toBe(explain);
    const buttons = [...nav.querySelectorAll('button')];
    expect(buttons.map(button => button.dataset.lnExt)).toEqual([
      'explain',
      'best',
      'retry',
      'next',
    ]);
    expect(buttons.map(button => button.disabled)).toEqual([true, true, true, false]);
    expect(buttons.map(button => button.classList.contains('ln-ext-btn--on'))).toEqual([
      true,
      false,
      false,
      false,
    ]);
    syncNav(nav, state(false), fr.ui);
    expect(nav.querySelector('[data-ln-ext="explain"]')).not.toBe(explain);
    expect(nav.textContent).toContain(fr.ui.next);
  });

  it('marks the four buttons all there, for a narrow panel to keep Next’s arrow alone', () => {
    const nav = document.createElement('div');
    syncNav(nav, state(true), en.ui);
    expect(nav.classList.contains('ln-ext-review__nav--four')).toBe(true);
    syncNav(nav, { ...state(true), retry: { on: false, enabled: false } }, en.ui);
    expect(nav.classList.contains('ln-ext-review__nav--four')).toBe(false);
    expect(nav.querySelector('[data-ln-ext="next"]')?.getAttribute('aria-label')).toBe(en.ui.next);
  });
});
