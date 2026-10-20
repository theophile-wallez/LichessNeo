import { normalizeUci } from '#page/review/chess/notation.ts';
import { nodeId, playUci } from './fake-chess.ts';

// Test support: a stand-in for Lichess's analysis page, its controller and
// its move list, for the original script and the port alike. Its fields
// mirror AnalyseCtrl's, plain and mutable as Lichess's are.

export interface FakeNode {
  id: string;
  ply: number;
  fen: string;
  uci?: string;
  san?: string;
  comp?: boolean;
  children: FakeNode[];
}

interface FakePosition {
  readonly ply: number;
  readonly fen: string;
  readonly uci?: string | undefined;
  readonly san?: string | undefined;
}

export interface FakeOptions {
  readonly id: string;
  readonly positions: readonly FakePosition[];
  readonly synthetic?: boolean;
  readonly speed?: string;
  readonly variant?: string;
  readonly players?: readonly [Record<string, unknown>, Record<string, unknown>];
  /** The masters database's answer for a position; throw to fail. */
  readonly masters?: (fen: string) => unknown;
  readonly signedIn?: boolean;
  /** The game has Lichess's server analysis. */
  readonly serverAnalysis?: boolean;
}

export interface FakeController {
  data: Record<string, unknown>;
  tree: { root: FakeNode; nodeAtPath: (path: string) => FakeNode };
  node: FakeNode;
  path: string;
  nodeList: FakeNode[];
  mainline: FakeNode[];
  onMainline: boolean;
  synthetic: boolean;
  orientation: 'white' | 'black';
  practice: unknown;
  /** "Learn from your mistakes", when on. */
  retro: unknown;
  menuOpen: boolean;
  treeVersion: number;
  drawnVersion: number;
  jumpToMain: (ply: number) => void;
  userJump: (path: string) => void;
  playUci: (uci: string) => void;
  redraw: () => void;
  getOrientation: () => 'white' | 'black';
  actionMenu: (open?: boolean) => boolean;
  togglePractice: (on?: boolean) => void;
  toggleRetro: () => void;
  hasFullComputerAnalysis: () => boolean;
  explorer: { fetchMasterOpening: (fen: string) => Promise<unknown>; isAuth: () => boolean };
}

function chain(positions: readonly FakePosition[]): FakeNode {
  const nodes: FakeNode[] = positions.map(({ ply, fen, uci, san }) => ({
    id: uci ? nodeId(uci) : '',
    ply,
    fen,
    ...(uci === undefined ? {} : { uci }),
    ...(san === undefined ? {} : { san }),
    children: [],
  }));
  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    if (node) nodes[i - 1]?.children.push(node);
  }
  const root = nodes[0];
  if (!root) throw new Error('a game needs a position');
  return root;
}

/** The nodes from the root along `path`, as far as they go. */
export function nodesAlong(root: FakeNode, path: string): FakeNode[] {
  const list = [root];
  let node = root;
  for (let at = 0; at < path.length; at += 2) {
    const child = node.children.find(candidate => candidate.id === path.slice(at, at + 2));
    if (!child) break;
    list.push(child);
    node = child;
  }
  return list;
}

function findFen(node: FakeNode, fen: string): FakeNode | undefined {
  if (node.fen === fen) return node;
  for (const child of node.children) {
    const found = findFen(child, fen);
    if (found) return found;
  }
  return undefined;
}

/**
 * The FEN `moves` (in the engine's notation) reach from the tree's position
 * `fen`, for the fake engine. A position sent alone needs no tree: the
 * threats' searches send positions of the game with the turn passed.
 */
export function fenAfter(root: FakeNode, fen: string, moves: readonly string[]): string {
  let node = findFen(root, fen);
  if (!node && moves.length === 0) return fen;
  for (const uci of moves)
    // Chess960 keeps Lichess's king-takes-rook castling: either notation matches.
    node = node?.children.find(
      child => child.uci === uci || normalizeUci(child.uci, node?.fen ?? '', false) === uci,
    );
  if (!node) throw new Error(`No such line in the fake tree: ${fen} moves ${moves.join(' ')}`);
  return node.fen;
}

function mainlineOf(root: FakeNode): FakeNode[] {
  const line = [root];
  for (let node = root.children[0]; node; node = node.children[0]) line.push(node);
  return line;
}

const lastOf = (list: readonly FakeNode[], fallback: FakeNode): FakeNode => list.at(-1) ?? fallback;

function jumpTo(ctrl: FakeController, path: string): void {
  const { root } = ctrl.tree;
  ctrl.path = path;
  ctrl.nodeList = nodesAlong(root, path);
  ctrl.node = lastOf(ctrl.nodeList, root);
  ctrl.onMainline = ctrl.nodeList.every((node, i) => ctrl.mainline[i] === node);
}

// Playing a move already in the tree jumps to it; a new move is added after its siblings.
function play(ctrl: FakeController, uci: string): void {
  const id = nodeId(uci);
  let child = ctrl.node.children.find(candidate => candidate.id === id);
  if (!child) {
    const { fen, san } = playUci(ctrl.node.fen, uci);
    child = { id, ply: ctrl.node.ply + 1, fen, uci, san, children: [] };
    ctrl.node.children.push(child);
    ctrl.mainline = mainlineOf(ctrl.tree.root);
    ctrl.treeVersion++;
  }
  jumpTo(ctrl, ctrl.path + id);
}

export function fakeController(options: FakeOptions): FakeController {
  const root = chain(options.positions);
  const [player, opponent] = options.players ?? [{ color: 'white' }, { color: 'black' }];
  let menu = false;
  const ctrl: FakeController = {
    data: {
      game: {
        id: options.id,
        speed: options.speed ?? 'blitz',
        variant: { key: options.variant ?? 'standard' },
      },
      player,
      opponent,
    },
    tree: { root, nodeAtPath: path => lastOf(nodesAlong(root, path), root) },
    node: root,
    path: '',
    nodeList: [root],
    mainline: mainlineOf(root),
    onMainline: true,
    synthetic: options.synthetic ?? false,
    orientation: 'white',
    practice: undefined,
    retro: undefined,
    menuOpen: false,
    treeVersion: 0,
    drawnVersion: -1,
    userJump: path => jumpTo(ctrl, path),
    jumpToMain: ply => {
      const path = ctrl.mainline
        .slice(1, ply - root.ply + 1)
        .map(node => node.id)
        .join('');
      jumpTo(ctrl, path);
    },
    playUci: uci => play(ctrl, uci),
    redraw: () => {},
    getOrientation: () => ctrl.orientation,
    actionMenu: open => {
      if (open !== undefined) menu = open;
      ctrl.menuOpen = menu;
      return menu;
    },
    togglePractice: on => {
      ctrl.practice = on ? {} : undefined;
    },
    toggleRetro: () => {
      ctrl.retro = ctrl.retro ? undefined : {};
    },
    hasFullComputerAnalysis: () => options.serverAnalysis ?? false,
    explorer: {
      fetchMasterOpening: async fen => (options.masters ?? (() => ({})))(fen),
      isAuth: () => options.signedIn ?? true,
    },
  };
  return ctrl;
}

/** The review's facade over a fake controller, as the page would give it. */
export function withFakeSite(ctrl: FakeController): void {
  Object.assign(window, { site: { analysis: ctrl } });
}
