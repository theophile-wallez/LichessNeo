import { closestTo, setData, setStyleProperty } from '#shared/dom.ts';
import { clamp } from '#shared/math.ts';
import type { Session } from '#page/review/session.ts';

// The panel's tooltip: dark, over what it explains, its tail pointing at it; under it
// when there's no room above (the move's time, at the card's top).

const MARGIN = 8;
const GAP = 10;

export interface TipInput {
  readonly anchor: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
  readonly width: number;
  readonly height: number;
  readonly viewportWidth: number;
}

export interface TipPlacement {
  readonly left: number;
  readonly top: number;
  /** The tail's x, from the tooltip's left edge. */
  readonly tail: number;
  /** Under its anchor, the tail pointing up. */
  readonly below: boolean;
}

/** Centers the tooltip over its anchor, or under it near the window's top, inside the window. */
export function tipPlacement({ anchor, width, height, viewportWidth }: TipInput): TipPlacement {
  const center = anchor.left + anchor.width / 2;
  const left = clamp(center - width / 2, MARGIN, viewportWidth - width - MARGIN);
  const above = anchor.top - height - GAP;
  const below = above < MARGIN;
  const top = below ? anchor.top + anchor.height + GAP : above;
  return { left, top, tail: center - left, below };
}

export function hideTip(session: Session): void {
  session.elements.tip.remove();
  session.tipFor = null;
}

/** What a tooltip says and points at, when it's not its target's `data-ln-ext-tip` and box. */
export interface TipContent {
  readonly text: string;
  readonly anchor: TipInput['anchor'];
}

export function showTip(session: Session, target: HTMLElement, content?: TipContent): void {
  const { tip } = session.elements;
  session.tipFor = target;
  tip.textContent = content?.text ?? target.dataset.lnExtTip ?? '';
  document.body.append(tip);
  const { left, top, tail, below } = tipPlacement({
    anchor: content?.anchor ?? target.getBoundingClientRect(),
    width: tip.offsetWidth,
    height: tip.offsetHeight,
    viewportWidth: window.innerWidth,
  });
  setStyleProperty(tip, 'left', `${left}px`);
  setStyleProperty(tip, 'top', `${top}px`);
  setStyleProperty(tip, '--ln-ext-tip-x', `${tail}px`);
  setData(tip, 'lnExtBelow', below ? '' : null);
}

export function watchTips(session: Session): void {
  const { panel } = session.elements;
  panel.addEventListener('pointerover', event => {
    const target = closestTo(event.target, '[data-ln-ext-tip]', HTMLElement);
    if (target) showTip(session, target);
  });
  panel.addEventListener('pointerout', event => {
    const target = closestTo(event.target, '[data-ln-ext-tip]', HTMLElement);
    const into = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (target && !target.contains(into)) hideTip(session);
  });
  // The rows scroll under a tooltip that stays put.
  panel.addEventListener('scroll', () => hideTip(session), true);
}
