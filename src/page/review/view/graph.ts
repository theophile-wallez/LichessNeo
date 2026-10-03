import type { Color } from '#shared/chess/types.ts';
import { setData, setStyleProperty } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { clamp } from '#shared/math.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { formatEval } from '#page/review/evaluation/format.ts';
import type { GraphKind, Review, Session } from '#page/review/session.ts';
import { graphMarkup, lastIndex } from './graph-markup.ts';
import { hidePreview, positionAt, showPreview } from './graph-preview.ts';
import { jump, stopPlaying } from './navigation.ts';

// The graph in the summary and over the move-by-move review: hovering shows
// a position's score and a little board of it, clicking goes to it.

interface Box {
  readonly padX: number;
  readonly width: number;
  readonly height: number;
}

function measure(container: HTMLElement): Box {
  const style = getComputedStyle(container);
  const padX = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
  const padY = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  return {
    padX,
    width: Math.max(100, Math.floor(container.clientWidth - padX)),
    height: Math.max(40, Math.floor(container.clientHeight - padY)),
  };
}

/** The position under the pointer's x, from the graph's left edge. */
export function indexAt(pointerX: number, box: Box, last: number): number {
  return clamp(Math.round(((pointerX - box.padX / 2) / box.width) * last), 0, last);
}

// What each container's graph shows now. Its listeners are added once: the
// moves graph's box is kept, and drawn again as the analysis fills in.
interface Drawn {
  readonly tip: HTMLElement;
  readonly review: Review;
  readonly box: Box;
  readonly orientation: Color;
  readonly pick: (index: number) => void;
}

const drawn = new WeakMap<HTMLElement, Drawn>();

function pointedIndex(container: HTMLElement, { review, box }: Drawn, event: MouseEvent): number {
  return indexAt(event.clientX - container.getBoundingClientRect().left, box, lastIndex(review));
}

function hover(container: HTMLElement, event: MouseEvent): void {
  const graph = drawn.get(container);
  if (!graph) return;
  const { tip, review, box } = graph;
  const index = pointedIndex(container, graph, event);
  const position = review.positions[index];
  const shown = positionAt(review, index);
  if (shown)
    showPreview(shown, graph.orientation, {
      x: event.clientX,
      graph: container.getBoundingClientRect(),
    });
  else hidePreview();
  if (!position) {
    setStyleProperty(tip, 'display', 'none');
    return;
  }
  tip.textContent = formatEval(position) || '0.00';
  setStyleProperty(tip, 'display', 'block');
  const x = box.padX / 2 + (index / (lastIndex(review) || 1)) * box.width;
  const right = container.clientWidth - box.padX / 2 - tip.offsetWidth;
  const left = clamp(x - tip.offsetWidth / 2, box.padX / 2, right);
  setStyleProperty(tip, 'left', `${left}px`);
}

function listen(container: HTMLElement): void {
  container.addEventListener('mousemove', event => hover(container, event));
  container.addEventListener('mouseleave', () => {
    const graph = drawn.get(container);
    if (graph) setStyleProperty(graph.tip, 'display', 'none');
    hidePreview();
  });
  container.addEventListener('click', event => {
    hidePreview();
    const graph = drawn.get(container);
    if (graph) graph.pick(pointedIndex(container, graph, event));
  });
}

export interface GraphTarget {
  readonly container: HTMLElement;
  readonly kind: GraphKind;
}

export function mountGraph(
  session: Session,
  analysis: Analysis,
  { container, kind }: GraphTarget,
): void {
  const { view } = session;
  const review = view.review;
  if (!review) return;
  const box = measure(container);
  setHtml(
    container,
    html`${graphMarkup(review, analysis.node.ply, box)}<span class="cdc-graph-tip"></span>`,
  );
  // The first time each graph shows, it draws itself from left to right.
  if (!view.revealed.has(kind)) {
    view.revealed.add(kind);
    container.firstElementChild?.classList.add('cdc-graph-reveal');
  }
  const tip = container.lastElementChild;
  if (!(tip instanceof HTMLElement)) return;
  const pick = (index: number): void => {
    stopPlaying(session);
    jump(analysis, index);
    if (view.mode === 'summary') session.setMode('moves');
  };
  if (!drawn.has(container)) listen(container);
  drawn.set(container, { tip, review, box, orientation: analysis.orientation(), pick });
}

/** The move-by-move graph, drawn again only as the analysis fills it in (or when forced). */
export function movesGraph(session: Session, analysis: Analysis, force = false): void {
  const { graphBox } = session.elements;
  const { review, version } = session.view;
  if (!review) {
    graphBox.replaceChildren();
    return;
  }
  if (!force && graphBox.dataset.cdcVersion === String(version)) return;
  setData(graphBox, 'cdcVersion', String(version));
  mountGraph(session, analysis, { container: graphBox, kind: 'moves' });
}
