// A study's export read as trees of moves, and a tree written back as the
// movetext Lichess imports: SAN moves, their variations and their comments.
// Move numbers, NAGs and results are dropped on reading; a game starts from
// the standard position, as practice's chapters do.

export interface PgnNode {
  readonly san: string;
  comment: string;
  readonly children: PgnNode[];
}

/** The position before the first move: its comment, and the moves from it. */
export interface PgnTree {
  comment: string;
  readonly children: PgnNode[];
}

export interface PgnGame {
  readonly tags: ReadonlyMap<string, string>;
  readonly tree: PgnTree;
}

const TOKENS = /\{[^}]*\}|[()]|;[^\n]*|\$\d+|\d+\.+|1-0|0-1|1\/2-1\/2|\*|[^\s(){};$]+/g;
const TAG = /^\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/;
const SKIPPED = /^(?:\$\d+|\d+\.+|1-0|0-1|1\/2-1\/2|\*|;.*)$/;

const addComment = (to: PgnTree, text: string): void => {
  const clean = text.slice(1, -1).trim();
  if (clean) to.comment = to.comment ? `${to.comment} ${clean}` : clean;
};

/** The tree of a game's movetext. */
export function parseMovetext(movetext: string): PgnTree {
  const root: PgnTree = { comment: '', children: [] };
  // The position the next move is played from, the one the last move was, and the last move.
  let parent: PgnTree = root;
  let before: PgnTree = root;
  let last: PgnNode | null = null;
  const stack: { parent: PgnTree; before: PgnTree; last: PgnNode | null }[] = [];
  for (const token of movetext.match(TOKENS) ?? []) {
    if (token.startsWith('{')) addComment(last ?? parent, token);
    else if (token === '(') {
      stack.push({ parent, before, last });
      // A variation stands for the last move: it's played from the position before it.
      parent = before;
      last = null;
    } else if (token === ')') ({ parent, before, last } = stack.pop() ?? { parent, before, last });
    else if (!SKIPPED.test(token)) {
      const node: PgnNode = { san: token, comment: '', children: [] };
      parent.children.push(node);
      before = parent;
      parent = node;
      last = node;
    }
  }
  return root;
}

/** The games of a PGN export, each its tags and its tree. */
export function parsePgn(text: string): PgnGame[] {
  return text
    .split(/\n\s*\n(?=\s*\[)/)
    .map(chunk => {
      const tags = new Map<string, string>();
      const movetext: string[] = [];
      for (const line of chunk.split('\n')) {
        const tag = TAG.exec(line.trim());
        if (tag?.[1]) tags.set(tag[1], (tag[2] ?? '').replaceAll(/\\(.)/g, '$1'));
        else movetext.push(line);
      }
      return { tags, tree: parseMovetext(movetext.join('\n')) };
    })
    .filter(game => game.tags.size > 0 || game.tree.children.length > 0);
}

/** A comment as PGN writes it: one that closed early would cut the moves after it. */
const commentText = (comment: string): string[] =>
  comment ? [`{ ${comment.replaceAll('}', ')')} }`] : [];

/** The move at `ply` (0, White's first), its number written for White, or for Black when `numbered`. */
function moveText(node: PgnNode, ply: number, numbered: boolean): string {
  const number = Math.floor(ply / 2) + 1;
  if (ply % 2 === 0) return `${number}. ${node.san}`;
  return numbered ? `${number}... ${node.san}` : node.san;
}

function lineText(from: PgnTree, ply: number, numbered: boolean): string[] {
  const [main, ...others] = from.children;
  if (!main) return [];
  const parts = [moveText(main, ply, numbered), ...commentText(main.comment)];
  for (const other of others) {
    const variation = [
      moveText(other, ply, true),
      ...commentText(other.comment),
      ...lineText(other, ply + 1, other.comment !== ''),
    ];
    parts.push(`(${variation.join(' ')})`);
  }
  // After a comment or a variation, Black's move says its number again.
  return [...parts, ...lineText(main, ply + 1, others.length > 0 || main.comment !== '')];
}

/** The tree as movetext, its main line each position's first move. */
export const writeMovetext = (tree: PgnTree): string =>
  [...commentText(tree.comment), ...lineText(tree, 0, false), '*'].join(' ');
