import { z } from 'zod/mini';
import type { Color } from '#shared/chess/types.ts';
import { createGuard } from '#shared/guards.ts';
import {
  type Controller,
  type GameCourse,
  GameCourseSchema,
  type GameData,
  GameDataSchema,
  isController,
  isExplorer,
  type MasterOpening,
  MasterOpeningSchema,
  type Player,
} from './controller.ts';
import { readSite } from './globals.ts';
import { method } from './method.ts';
import { isTreeNode, type TreeNode } from './tree.ts';

// Lichess's analysis controller, `site.analysis` on analysis pages only, as
// a typed facade. Members Lichess reassigns as the user moves are narrowed
// on every read; a node of another shape means Lichess changed, and throws.

export type { GameCourse, GameData, MasterOpening, Player } from './controller.ts';

const isToggle = createGuard(method<[value?: boolean]>());
const isPlayUci = createGuard(method<[uci: string]>());
// A method called without arguments.
const isAction = createGuard(method<[]>());

function narrowNode(value: unknown): TreeNode {
  if (!isTreeNode(value)) throw new Error('Lichess’s analysis tree has an unexpected node');
  return value;
}

function narrowNodes(value: unknown): readonly TreeNode[] {
  return Array.isArray(value) ? value.map(narrowNode) : [];
}

export class Analysis {
  readonly #controller: Controller;
  #dataSource: unknown = null;
  #data: GameData | null = null;

  constructor(controller: Controller) {
    this.#controller = controller;
  }

  /** `ctrl.data`, or null when it isn't a game's data we know. */
  get data(): GameData | null {
    const source = this.#controller.data;
    if (source !== this.#dataSource) {
      this.#dataSource = source;
      const result = GameDataSchema.safeParse(source);
      this.#data = result.success ? result.data : null;
    }
    return this.#data;
  }

  /** The game's move times and phases, or null for data of another shape. */
  get course(): GameCourse | null {
    const result = GameCourseSchema.safeParse(this.#controller.data);
    return result.success ? result.data : null;
  }

  get gameId(): string {
    return this.data?.game.id ?? '';
  }

  get chess960(): boolean {
    return this.data?.game.variant.key === 'chess960';
  }

  /** The side that won the game; null for a draw, a game going on or the free board. */
  get winner(): Color | null {
    return this.data?.game.winner ?? null;
  }

  /** Both players by color, as Lichess lists them from the viewer's side. */
  players(): Readonly<Record<Color, Player | undefined>> {
    const data = this.data;
    const byColor = (color: Color): Player | undefined => {
      if (data?.opponent.color === color) return data.opponent;
      return data?.player.color === color ? data.player : undefined;
    };
    return { white: byColor('white'), black: byColor('black') };
  }

  /** The side the signed-in user played in this game; null when they didn't play it. */
  viewerColor(): Color | null {
    const me = document.body.dataset.user?.toLowerCase();
    if (!me) return null;
    const players = this.players();
    const plays = (color: Color): boolean => players[color]?.user?.username?.toLowerCase() === me;
    if (plays('white') === plays('black')) return null;
    return plays('white') ? 'white' : 'black';
  }

  get node(): TreeNode {
    return narrowNode(this.#controller.node);
  }

  get path(): string {
    const { path } = this.#controller;
    return typeof path === 'string' ? path : '';
  }

  get onMainline(): boolean {
    return this.#controller.onMainline === true;
  }

  /** The controller has built its game tree. */
  get hasMainline(): boolean {
    return Array.isArray(this.#controller.mainline);
  }

  get mainline(): readonly TreeNode[] {
    return narrowNodes(this.#controller.mainline);
  }

  /** The nodes from the root to the one on the board. */
  get nodeList(): readonly TreeNode[] {
    return narrowNodes(this.#controller.nodeList);
  }

  /** The free analysis board, whose tree grows as the user plays. */
  get synthetic(): boolean {
    return Boolean(this.#controller.synthetic);
  }

  /** The node at `path`, or the deepest one found along it (Lichess's rule). */
  nodeAtPath(path: string): TreeNode {
    return narrowNode(this.#controller.tree.nodeAtPath(path));
  }

  jumpToMain(ply: number): void {
    this.#controller.jumpToMain(ply);
  }

  userJump(path: string): void {
    this.#controller.userJump(path);
  }

  get canPlayUci(): boolean {
    return isPlayUci(this.#controller.playUci);
  }

  /** Plays a move from the node on the board, if this page can. */
  playUci(uci: string): void {
    const { playUci } = this.#controller;
    if (isPlayUci(playUci)) playUci.call(this.#controller, uci);
  }

  redraw(): void {
    const { redraw } = this.#controller;
    if (isAction(redraw)) redraw.call(this.#controller);
  }

  orientation(): Color {
    return this.#controller.getOrientation() === 'black' ? 'black' : 'white';
  }

  closeActionMenu(): void {
    const { actionMenu } = this.#controller;
    if (isToggle(actionMenu) && Boolean(actionMenu.call(this.#controller)))
      actionMenu.call(this.#controller, false);
  }

  /** "Learn from your mistakes" is on. */
  get retroOn(): boolean {
    return Boolean(this.#controller.retro);
  }

  /** Ends "practice with computer", which plays moves on its own. */
  stopPractice(): void {
    const { practice, togglePractice } = this.#controller;
    if (Boolean(practice) && isToggle(togglePractice)) togglePractice.call(this.#controller, false);
  }

  /** The game has Lichess's server analysis, which "Learn from your mistakes" needs. */
  get hasServerAnalysis(): boolean {
    const { hasFullComputerAnalysis: check } = this.#controller;
    return isAction(check) && Boolean(check.call(this.#controller));
  }

  /** Turns "Learn from your mistakes" on or off, as Lichess's own button does. */
  setRetro(on: boolean): void {
    const { toggleRetro } = this.#controller;
    if (this.retroOn !== on && isAction(toggleRetro)) toggleRetro.call(this.#controller);
  }

  /** The masters database answers only a signed-in user. */
  explorerSignedIn(): boolean {
    const { explorer } = this.#controller;
    return isExplorer(explorer) && Boolean(explorer.isAuth?.());
  }

  /** The masters database's games for a position; rejects when it can't tell. */
  async fetchMasterOpening(fen: string): Promise<MasterOpening> {
    const { explorer } = this.#controller;
    if (!isExplorer(explorer) || !explorer.fetchMasterOpening)
      throw new Error('No opening explorer');
    const answer: unknown = await explorer.fetchMasterOpening(fen);
    return MasterOpeningSchema.parse(answer);
  }
}

const facades = new WeakMap<Controller, Analysis>();

const hasAnalysis = createGuard(z.object({ analysis: z.unknown() }));

/** The page's analysis controller, if it has one. */
export function analysis(): Analysis | null {
  const site = readSite();
  const controller = hasAnalysis(site) ? site.analysis : null;
  if (!isController(controller)) return null;
  let facade = facades.get(controller);
  if (!facade) {
    facade = new Analysis(controller);
    facades.set(controller, facade);
  }
  return facade;
}

const hasNode = createGuard(z.object({ analysis: z.object({ node: z.unknown() }) }));

/** The node on the board, if this page has an analysis controller. */
export function currentNode(): TreeNode | null {
  const site = readSite();
  const node = hasNode(site) ? site.analysis.node : null;
  return isTreeNode(node) ? node : null;
}
