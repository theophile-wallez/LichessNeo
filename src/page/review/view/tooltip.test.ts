import { afterEach, describe, expect, it } from 'vitest';
import { newSession } from '#page/review/fixtures/unit-review.ts';
import type { Session } from '#page/review/session.ts';
import { watchTips } from './tooltip.ts';

afterEach(() => {
  document.body.replaceChildren();
});

/** A panel with the engine's button and another that opens something, their tips watched. */
function panel(): { readonly session: Session; readonly other: HTMLButtonElement } {
  const session = newSession();
  const { elements } = session;
  elements.graphEngine.dataset.lnExtTip = 'Debrief analysis';
  const other = document.createElement('button');
  other.dataset.lnExtTip = 'Share';
  other.setAttribute('aria-expanded', 'true');
  elements.panel.append(elements.graphEngine, other);
  document.body.append(elements.panel);
  watchTips(session);
  return { session, other };
}

const pointAt = (target: Element): void => {
  target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
};

describe('the panel’s tips', () => {
  it('name the engine’s button while its popover is closed', () => {
    const { session } = panel();
    pointAt(session.elements.graphEngine);
    expect(session.elements.tip.isConnected).toBe(true);
    expect(session.elements.tip.textContent).toBe('Debrief analysis');
  });

  it('leave the engine’s button unnamed while its popover is open', () => {
    const { session } = panel();
    session.view.engine = true;
    pointAt(session.elements.graphEngine);
    expect(session.elements.tip.isConnected).toBe(false);
    expect(session.tipFor).toBeNull();
  });

  it('still name another button whose part is open', () => {
    const { session, other } = panel();
    session.view.engine = true;
    pointAt(other);
    expect(session.tipFor).toBe(other);
    expect(session.elements.tip.textContent).toBe('Share');
  });
});
