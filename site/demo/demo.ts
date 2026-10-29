import type { Square } from '#shared/chess/index.ts';
import { setHtml } from '#shared/html.ts';
import { en } from '#page/review/i18n/en.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { showMoment } from '#page/review/view/moments.ts';
import { syncNav } from '#page/review/view/nav.ts';
import { MISS_MS } from '#page/review/view/retry.ts';
import { DemoBoard } from './board.ts';
import { Typist } from './card.ts';
import { DemoCoach } from './coach.ts';
import { bestLine, type Line } from './explain.ts';
import { navState, toggled } from './nav.ts';
import { drawCursor, drawEval, setPieceGlyphs } from './gauges.ts';
import { LICHESS_SET } from './pieces.ts';
import { capturedOf } from './players.ts';
import { pickedOn, retryParts, type RetryState } from './retry.ts';
import { moves, positions } from './review.ts';
import { COMMENT, type Scene, sceneOf, type View } from './scene.ts';

// The live review: the game plays itself, a move once the coach has said its
// piece, and starts over at the end. A click on a move, the graph, the key
// moments, the controls or the card's buttons takes over, and the play button
// hands back.

// How long a comment stays once typed, how long the mate stays before it all
// starts over, and how long each move of Explain's line stays on the board.
const DWELL_MS = 2200;
const END_MS = 6000;
const LINE_MS = 700;

export interface DemoParts {
  readonly root: HTMLElement;
  readonly panel: HTMLElement;
  readonly board: HTMLElement;
  readonly coach: HTMLElement;
  readonly say: HTMLElement;
  readonly nav: HTMLElement;
  readonly graphCursor: HTMLElement;
  readonly moves: HTMLElement;
  readonly evalBar: HTMLElement;
  readonly capturedTop: HTMLElement;
  readonly capturedBottom: HTMLElement;
}

export type CardButton = 'explain' | 'best' | 'retry';

export class Demo {
  readonly #parts: DemoParts;
  readonly #board: DemoBoard;
  readonly #coach: DemoCoach;
  readonly #typist: Typist;
  #ply = 0;
  #view: View = COMMENT;
  // While retrying, the coach's lines already said: a hint asked for only types its own.
  #said = 0;
  #playing = true;
  #visible = false;
  #next = 0;
  #coachNumber: number;

  constructor(parts: DemoParts, coach: number) {
    this.#parts = parts;
    this.#coachNumber = coach;
    this.#board = new DemoBoard(parts.board, LICHESS_SET);
    this.#coach = new DemoCoach(parts.coach, coach);
    this.#typist = new Typist(talking => this.#coach.setTalking(talking));
    new IntersectionObserver(([entry]) => this.#setVisible(entry?.isIntersecting ?? false), {
      threshold: 0.25,
    }).observe(parts.root);
  }

  get coach(): DemoCoach {
    return this.#coach;
  }

  start(): void {
    setPieceGlyphs(document.documentElement, LICHESS_SET);
    this.#show(0, true);
    // Without the mascot's chunk (offline, no WebGL), the still stays.
    this.#coach.mount().catch(() => undefined);
  }

  #setVisible(visible: boolean): void {
    if (visible === this.#visible) return;
    this.#visible = visible;
    if (visible && this.#playing) this.#show(this.#ply, true);
    else this.#hold();
  }

  #hold(): void {
    clearTimeout(this.#next);
    this.#typist.stop();
  }

  get #move(): MoveVerdict | null {
    return this.#ply > 0 ? (moves[this.#ply - 1] ?? null) : null;
  }

  /** Puts the game at `ply`, its comment on the card; typed, the coach types it out. */
  #show(ply: number, typed: boolean): void {
    this.#ply = ply;
    this.#view = COMMENT;
    this.#said = 0;
    drawEval(this.#parts.evalBar, ply);
    drawCursor(this.#parts, ply);
    this.#render(typed);
  }

  /** Draws the view of the move on the board: the position, its marks, the card and its buttons. */
  #render(typed: boolean): void {
    this.#hold();
    const move = this.#move;
    const scene = sceneOf(move, {
      ply: this.#ply,
      view: this.#view,
      coach: this.#coachNumber,
      language: en,
      said: this.#said,
    });
    this.#drawBoard(scene);
    this.#coach.setMood(scene.mood);
    const { say, nav, panel } = this.#parts;
    setHtml(say, scene.card);
    say.dataset.class = scene.look;
    this.#parts.root.dataset.retrying = String(this.#view.kind === 'retry');
    syncNav(nav, navState(move, this.#view, this.#ply < positions.length - 1), en.ui);
    showMoment(panel, this.#ply);
    if (move && this.#view.kind === 'retry')
      this.#said = retryParts(move, this.#view.retry, en).length;
    if (typed && this.#visible) this.#typist.type(say, () => this.#afterComment());
    else for (const word of say.querySelectorAll('.ln-ext-w--off')) word.className = 'ln-ext-w';
  }

  #drawBoard(scene: Scene): void {
    this.#board.show(scene.fen);
    this.#board.setUnder(scene.under);
    this.#board.setOver(scene.over);
    const captured = capturedOf(scene.fen);
    setHtml(this.#parts.capturedTop, captured.top);
    setHtml(this.#parts.capturedBottom, captured.bottom);
  }

  #afterComment(): void {
    if (!this.#playing) return;
    const last = this.#ply >= positions.length - 1;
    this.#next = window.setTimeout(
      () => this.#show(last ? 0 : this.#ply + 1, true),
      last ? END_MS : DWELL_MS,
    );
  }

  /** The visitor takes over: the game stops where they put it. */
  go(ply: number): void {
    this.setPlaying(false);
    this.#show(Math.max(0, Math.min(positions.length - 1, ply)), true);
  }

  step(by: number): void {
    this.go(this.#ply + by);
  }

  /** Retry on the move of `ply`, as Lichess's exercise asks for a better one. */
  retryAt(ply: number): void {
    this.go(ply);
    this.press('retry');
  }

  /** One of the card's buttons: its view on, or off again. */
  press(button: CardButton): void {
    this.setPlaying(false);
    this.#view = toggled(this.#view, button);
    this.#said = 0;
    this.#render(true);
  }

  /** A move of a line put on the board, from a chip of the card; null goes back to the move. */
  playLine(line: Line | null): void {
    if (this.#view.kind !== 'comment' && this.#view.kind !== 'explain') return;
    this.setPlaying(false);
    this.#view = { kind: this.#view.kind, line };
    this.#render(false);
  }

  /** Explain's button: the best line played out on the board, a move at a time, or put away. */
  toggleLine(): void {
    const move = this.#move;
    const best = move ? bestLine(move) : null;
    if (this.#view.kind !== 'explain' || !best) return;
    if (this.#view.line) return this.playLine(null);
    const play = (plies: number): void => {
      this.playLine({ base: 'b', ucis: best.slice(0, plies) });
      if (plies < best.length) this.#next = window.setTimeout(() => play(plies + 1), LINE_MS);
    };
    play(1);
  }

  /** While retrying: a hint more, or the answer. */
  retryAsk(ask: 'hint' | 'reveal'): void {
    const move = this.#move;
    if (this.#view.kind !== 'retry' || !move?.best) return;
    const { retry } = this.#view;
    const next: RetryState =
      ask === 'hint'
        ? { ...retry, hints: retry.hints + 1 }
        : {
            ...retry,
            picked: null,
            outcome: { kind: 'revealed', uci: move.best, san: move.bestSan },
          };
    this.#setRetry(next);
  }

  #setRetry(retry: RetryState, typed = true): void {
    this.#view = { kind: 'retry', retry };
    this.#render(typed);
  }

  /** A square of the board clicked while retrying: the piece to move, then where to. */
  pick(square: Square): void {
    const move = this.#move;
    if (this.#view.kind !== 'retry' || !move) return;
    const { retry } = this.#view;
    const picked = pickedOn(move, retry, square);
    if (picked === retry) return;
    this.#setRetry(picked, picked.outcome !== retry.outcome);
    const { kind } = picked.outcome;
    // A miss stays on the board a moment, then the board goes back for another try.
    if (kind === 'wrong' || kind === 'same')
      this.#next = window.setTimeout(
        () => this.#setRetry({ ...picked, outcome: { kind: 'waiting' } }),
        MISS_MS,
      );
  }

  setPlaying(playing: boolean): void {
    this.#playing = playing;
    this.#parts.root.dataset.playing = String(playing);
    if (!playing) {
      clearTimeout(this.#next);
      return;
    }
    const last = this.#ply >= positions.length - 1;
    this.#show(last ? 0 : this.#ply + 1, true);
  }

  get playing(): boolean {
    return this.#playing;
  }

  setCoach(coach: number): void {
    this.#coachNumber = coach;
    this.#coach.setCoach(coach);
    // Each coach words a move its own way.
    this.#render(true);
  }

  setPieceSet(pieceSet: string): void {
    this.#board.setPieceSet(pieceSet);
    setPieceGlyphs(document.documentElement, pieceSet);
  }
}
