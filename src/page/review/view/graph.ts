import type { Color } from '#shared/chess/types.ts';
import { setData, setStyleProperty } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { clamp } from '#shared/math.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import type { MoveTime } from '#page/charts/game/series.ts';
import { spentTime } from '#page/review/coach/clock.ts';
import { formatEval } from '#page/review/evaluation/format.ts';
import type { GraphKind, GraphView, Review, Session } from '#page/review/session.ts';
import { graphMarkup, lastIndex } from './graph-markup.ts';
import { hidePreview, positionAt, showPreview } from './graph-preview.ts';
import { timesMarkup } from './graph-times.ts';
import { jump, stopPlaying } from './navigation.ts';
import { gameTimes } from './timing.ts';

// The graph in the summary and over the move-by-move review: hovering shows
// a position's score (or, over the move times, the move's time) and a little
// board of it, clicking goes to it.

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
  readonly shown: GraphView;
  /** The tip's words over a position, null for none. */
  readonly tipAt: (index: number) => string | null;
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
  const words = graph.tipAt(index);
  const shown = positionAt(review, index);
  if (shown)
    showPreview(shown, graph.orientation, {
      x: event.clientX,
      graph: container.getBoundingClientRect(),
    });
  else hidePreview();
  if (words === null) {
    setStyleProperty(tip, 'display', 'none');
    return;
  }
  tip.textContent = words;
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

const scoreTip =
  (review: Review) =>
  (index: number): string | null => {
    const position = review.positions[index];
    return position ? formatEval(position) || '0.00' : null;
  };

const timeTip =
  (times: readonly MoveTime[], session: Session) =>
  (index: number): string | null => {
    const time = times.find(each => each.ply === index);
    return time ? `${time.san} · ${spentTime(time.seconds, session.language.ui.clock)}` : null;
  };

export function mountGraph(
  session: Session,
  analysis: Analysis,
  { container, kind }: GraphTarget,
): void {
  const { view } = session;
  const review = view.review;
  if (!review) return;
  const box = measure(container);
  const ply = analysis.node.ply;
  // Only the move-by-move graph shows the move times, and only a game with clocks has them.
  const times = kind === 'moves' && view.graph === 'time' ? gameTimes(analysis) : [];
  const shown: GraphView = times.length > 0 ? 'time' : 'advantage';
  const svg =
    shown === 'time'
      ? timesMarkup({ times, last: lastIndex(review), ply }, box)
      : graphMarkup(review, ply, box);
  setHtml(container, html`${svg}<span class="lr-ext-graph-tip"></span>`);
  // The first time each graph shows, it draws itself from left to right; on a change of
  // view, faster, as the toggle's pick slides.
  const previous = drawn.get(container);
  if (!view.revealed.has(kind)) {
    view.revealed.add(kind);
    container.firstElementChild?.classList.add('lr-ext-graph-reveal');
  } else if (previous && previous.shown !== shown)
    container.firstElementChild?.classList.add('lr-ext-graph-switch');
  const tip = container.lastElementChild;
  if (!(tip instanceof HTMLElement)) return;
  const pick = (index: number): void => {
    stopPlaying(session);
    jump(analysis, index);
    if (view.mode === 'summary') session.setMode('moves');
  };
  if (!previous) listen(container);
  const tipAt = shown === 'time' ? timeTip(times, session) : scoreTip(review);
  drawn.set(container, {
    tip,
    review,
    box,
    orientation: analysis.orientation(),
    shown,
    tipAt,
    pick,
  });
}

/** The move-by-move graph, drawn again only as the analysis fills it in (or when forced). */
export function movesGraph(session: Session, analysis: Analysis, force = false): void {
  const { graphBox } = session.elements;
  const { review, version } = session.view;
  if (!review) {
    graphBox.replaceChildren();
    return;
  }
  if (!force && graphBox.dataset.lrExtVersion === String(version)) return;
  setData(graphBox, 'lrExtVersion', String(version));
  mountGraph(session, analysis, { container: graphBox, kind: 'moves' });
}
