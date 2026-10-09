import { closestTo, setStyleProperty } from '#shared/dom.ts';
import { clamp } from '#shared/math.ts';
import type { Session } from '#page/review/session.ts';

// The panel's tooltip: dark, over what it explains, its tail pointing at it.

const MARGIN = 8;
const GAP = 10;

export interface TipInput {
  readonly anchor: Pick<DOMRect, 'left' | 'top' | 'width'>;
  readonly width: number;
  readonly height: number;
  readonly viewportWidth: number;
}

export interface TipPlacement {
  readonly left: number;
  readonly top: number;
  /** The tail's x, from the tooltip's left edge. */
  readonly tail: number;
}

/** Centers the tooltip over its anchor, keeping it inside the window. */
export function tipPlacement({ anchor, width, height, viewportWidth }: TipInput): TipPlacement {
  const center = anchor.left + anchor.width / 2;
  const left = clamp(center - width / 2, MARGIN, viewportWidth - width - MARGIN);
  return { left, top: anchor.top - height - GAP, tail: center - left };
}

export function hideTip(session: Session): void {
  session.elements.tip.remove();
  session.tipFor = null;
}

/** What a tooltip says and points at, when it's not its target's `data-lr-ext-tip` and box. */
export interface TipContent {
  readonly text: string;
  readonly anchor: TipInput['anchor'];
}

export function showTip(session: Session, target: HTMLElement, content?: TipContent): void {
  const { tip } = session.elements;
  session.tipFor = target;
  tip.textContent = content?.text ?? target.dataset.lrExtTip ?? '';
  document.body.append(tip);
  const { left, top, tail } = tipPlacement({
    anchor: content?.anchor ?? target.getBoundingClientRect(),
    width: tip.offsetWidth,
    height: tip.offsetHeight,
    viewportWidth: window.innerWidth,
  });
  setStyleProperty(tip, 'left', `${left}px`);
  setStyleProperty(tip, 'top', `${top}px`);
  setStyleProperty(tip, '--lr-ext-tip-x', `${tail}px`);
}

export function watchTips(session: Session): void {
  const { panel } = session.elements;
  panel.addEventListener('pointerover', event => {
    const target = closestTo(event.target, '[data-lr-ext-tip]', HTMLElement);
    if (target) showTip(session, target);
  });
  panel.addEventListener('pointerout', event => {
    const target = closestTo(event.target, '[data-lr-ext-tip]', HTMLElement);
    const into = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (target && !target.contains(into)) hideTip(session);
  });
  // The rows scroll under a tooltip that stays put.
  panel.addEventListener('scroll', () => hideTip(session), true);
}
