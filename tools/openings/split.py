"""Splits a chapter's tree of moves into parts Lichess takes: a chapter's PGN
over 100,000 characters is refused ("PGN too large"), and one over 3,000 moves
too. A tree too long is cut into subtrees of an eighth of a part's budget,
packed into parts with what's left of the chapter's own. Each node's comment goes in one part only: the part that carries
the subtree it's in. That part also holds all of its children, those cut off as
bare moves, so the review reads the same moves after it (theory/study.ts).
Positions on the way to a subtree are bare moves in its part.
"""

import io

import chess
import chess.pgn

# Lichess's limits are 100,000 characters and 3,000 moves: these leave room.
MAX_CHARS = 96_000
MAX_NODES = 2_700
HARD_CHARS = 98_500
# Subtrees this many times smaller than a part: whole ones would leave each part half empty.
PIECES = 8
# A move in the movetext beside its comment: its number, its SAN, the brackets.
MOVE_CHARS = 16
MISTAKE_NAGS = {chess.pgn.NAG_MISTAKE, chess.pgn.NAG_BLUNDER, chess.pgn.NAG_DUBIOUS_MOVE}


class Weight:
    def __init__(self, chars=0, nodes=0):
        self.chars, self.nodes = chars, nodes

    def __add__(self, other):
        return Weight(self.chars + other.chars, self.nodes + other.nodes)

    def __sub__(self, other):
        return Weight(self.chars - other.chars, self.nodes - other.nodes)

    def over(self, budget):
        return self.chars > budget.chars or self.nodes > budget.nodes


STUB = Weight(MOVE_CHARS, 1)


def own_weight(node):
    return Weight(MOVE_CHARS + len(node.comment or ''), 1)


def plan(node, path, budget, cuts):
    """The weight left of `node`'s subtree once the cuts it needs are made, each added to `cuts`."""
    left = {move: plan(child, path + (move,), budget, cuts) for move, child in node.children.items()}
    total = own_weight(node)
    for weight in left.values():
        total += weight
    for move in sorted(left, key=lambda each: -left[each].chars):
        if not total.over(budget):
            break
        cuts.append((path + (move,), left[move] + Weight(MOVE_CHARS * len(path), len(path))))
        total -= left[move] - STUB
    return total


def pack(cuts, budget):
    """The cuts in parts, first fit, the heaviest first."""
    parts = []
    for path, weight in sorted(cuts, key=lambda cut: -cut[1].chars):
        for part in parts:
            if not (part['weight'] + weight).over(budget):
                part['paths'].add(path)
                part['weight'] += weight
                break
        else:
            parts.append({'paths': {path}, 'weight': weight})
    return [part['paths'] for part in parts]


def build(root, cut, carried):
    """The part that carries the subtrees `carried` (paths; () is the chapter's own part)."""
    Node = type(root)
    ancestors = {path[:i] for path in carried for i in range(len(path))}

    def owner(path):
        return next((path[:i] for i in range(len(path), 0, -1) if path[:i] in cut), ())

    def copy(node, path, content):
        part = Node()
        part.first, part.nags = node.first, node.nags
        part.comment = node.comment if content else None
        for move, child in node.children.items():
            at = path + (move,)
            inside = owner(at) in carried
            # A bare move, for a carried node's children: its moves stay whole.
            if inside or at in ancestors:
                part.children[move] = copy(child, at, inside)
            elif content:
                stub = part.children[move] = Node()
                stub.nags = child.nags
        return part

    return copy(root, (), () in carried)


def split(root, budget=None):
    """The chapter's tree as parts within Lichess's limits: itself when it fits."""
    budget = budget or Weight(MAX_CHARS, MAX_NODES)
    whole_cuts = []
    plan(root, (), budget, whole_cuts)
    if not whole_cuts:
        return [root]
    cuts = []
    rest = plan(root, (), Weight(budget.chars // PIECES, budget.nodes // PIECES), cuts)
    # The part with the chapter's start comes first.
    parts = sorted(pack([((), rest)] + cuts, budget), key=lambda paths: () not in paths)
    cut = {path for path, _ in cuts}
    return [build(root, cut, paths) for paths in parts]


def commented(pgns):
    """Each commented node of the games, by its moves from the start: its comment, the moves on from it, its mark.

    Keyed by path, not position: two lines of a chapter may transpose into one position.
    """
    found = {}
    for pgn in pgns:
        game = chess.pgn.read_game(io.StringIO(pgn))
        stack = list(game.variations)
        while stack:
            node = stack.pop()
            stack.extend(node.variations)
            if not node.comment.strip():
                continue
            key = tuple(move.uci() for move in node.board().move_stack)
            if key in found:
                raise ValueError(f'{" ".join(key)} is commented twice')
            moves = frozenset(
                child.san() for child in node.variations if not child.nags & MISTAKE_NAGS
            )
            found[key] = (node.comment, moves, bool(node.nags & MISTAKE_NAGS))
    return found


def fits(pgn):
    game = chess.pgn.read_game(io.StringIO(pgn))
    nodes = sum(1 for _ in iter_nodes(game))
    return len(pgn) < HARD_CHARS and nodes <= MAX_NODES


def iter_nodes(game):
    stack = list(game.variations)
    while stack:
        node = stack.pop()
        stack.extend(node.variations)
        yield node
