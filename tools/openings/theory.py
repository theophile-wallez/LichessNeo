"""The coach's opening theory, as the PGN of the public study the review reads
it from (study.py pushes it), from the entries of tools/openings/theory/*.json:
each a line of moves, what its position is about in English (rewritten from
Wikibooks' Chess Opening Theory, wikibooks.py, or written by hand) and in
French, and the moves theory goes on with. Each file is a chapter, its entries'
texts the comments of their positions, and the moves theory goes on with each
position's first moves. A chapter too long for Lichess is split in parts
(split.py). Needs python-chess.

  python3 tools/openings/theory.py <folder>           # en.pgn, and fr.pgn once every text has one
  python3 tools/openings/theory.py <folder> en fr     # those languages, every text required
  python3 tools/openings/theory.py <folder> --sources <dir>   # another folder of chapters

In a source's text, {Nf3} is a move and [e5] a square. A move is checked on the
board: one the side to move can play, one either side could play after one more
move of its own (a plan: {e3}, then {Bd3}), or one of the line's own. {Qxb6
axb6} is a sequence, each move checked after the one before. {w:Re1} or
{b:Re8} names a later move, unchecked: the script lists those to look over.

An entry's "mistakes" are the errors players often make in its position, each
{"move": "Bxb4", "mark": "??", "punish": "Bxg7 Nf6 Bxh8", "en": "..."}: the
move, its mark ("?" by default), the moves that punish it, and what the coach
says when it's played, its moves read in the position after it. The study keeps
each as a variation, marked, its text the comment, the punishment after it.
An entry or a mistake may draw on the board: "shapes": ["Ge2e4", "Rd5"], an
arrow or a square in Lichess's brushes (Green, Red, Yellow, Blue), written as
[%cal Ge2e4] and [%csl Rd5] after the comment.
The study writes a move [Nf3], and a square as it is, e5, since a PGN comment
ends at the first }: the review reads them back (theory/study-text.ts).
"""

import argparse
import json
import re
import sys
from pathlib import Path

import chess
import chess.pgn

# `python -I` leaves the script's folder off the path.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from split import commented, fits, split

SOURCES = Path(__file__).resolve().parent / 'theory'
MARK = re.compile(r'\{(?:([wb]):)?([^{}]+)\}|\[([a-h][1-8])\]')
SHAPE = re.compile(r'^[GRYB]([a-h][1-8])([a-h][1-8])?$')
LANGUAGES = ('en', 'fr')
# Lichess's 64 chapters a study holds, less the old one study.py keeps while it pushes.
MAX_CHAPTERS = 63

# Each source's chapter, in the order the study lists them, in each language:
# the French names are Lichess's own for the openings.
CHAPTERS = {
    'core': ('First moves', 'Premiers coups'),
    'italian': ('Italian Game', 'Partie italienne'),
    'two-knights': ('Two Knights Defence', 'Défense des deux cavaliers'),
    'scotch': ('Scotch Game', 'Partie écossaise'),
    'ruy-lopez': ('Ruy Lopez', 'Partie espagnole'),
    'four-knights': ('Four Knights Game', 'Partie des quatre cavaliers'),
    'open-games': ('Other open games', 'Autres débuts ouverts'),
    'petrov': ("Petrov's Defence", 'Défense Petrov'),
    'e5-defences': ('Other replies to 2.Nf3', 'Autres réponses à 2.Cf3'),
    'vienna': ("Vienna Game and Bishop's Opening", 'Partie viennoise et début du fou'),
    'kings-gambit': ("King's Gambit", 'Gambit du roi'),
    'sicilian': ('Sicilian Defence', 'Défense sicilienne'),
    'french': ('French Defence', 'Défense française'),
    'caro-kann': ('Caro-Kann Defence', 'Défense Caro-Kann'),
    'scandinavian': ('Scandinavian Defence', 'Défense scandinave'),
    'pirc-modern': ('Pirc and Modern Defence', 'Défense Pirc et défense moderne'),
    'alekhine': ("Alekhine's Defence", 'Défense Alekhine'),
    'e4-sidelines': ('Other replies to 1.e4', 'Autres réponses à 1.e4'),
    'queens-gambit': ("Queen's Gambit", 'Gambit dame'),
    'queens-gambit-declined': ("Queen's Gambit Declined", 'Gambit dame refusé'),
    'slav': ('Slav and Semi-Slav', 'Défense slave et semi-slave'),
    'london': ('London System', 'Système de Londres'),
    'queens-pawn': ("Queen's Pawn systems", 'Débuts du pion dame'),
    'd4-gambits': ('Gambits and sidelines after 1.d4', 'Gambits et variantes rares après 1.d4'),
    'kings-indian': ("King's Indian Defence", 'Défense est-indienne'),
    'nimzo-indian': (
        "Nimzo-Indian and Queen's Indian",
        'Défenses nimzo-indienne et ouest-indienne',
    ),
    'catalan': ('Catalan Opening', 'Ouverture catalane'),
    'grunfeld': ('Grünfeld Defence', 'Défense Grünfeld'),
    'benoni': ('Benoni and Benko', 'Défense Benoni et gambit Benko'),
    'dutch': ('Dutch Defence', 'Défense hollandaise'),
    'indian-sidelines': ('Other Indian defences', 'Autres défenses indiennes'),
    'english': ('English Opening', 'Ouverture anglaise'),
    'flank': ('Réti and flank openings', 'Réti et débuts de flanc'),
    'first-moves': ('Unusual first moves', 'Premiers coups inhabituels'),
}

# The first comment of each chapter, for those who read or edit the study.
INTRO = {
    'en': "Lichess Neo's coach explains these positions in its Game Review. In a comment, "
    '[Nf3] is a move, [Qb3 Qxb3 axb3] moves one after the other, [w:Re1] a later move of White, '
    'and a square is written as it is, e5. '
    "Each position's first moves are those theory goes on with.",
    'fr': 'Le coach de Lichess Neo explique ces positions dans son Bilan. Dans un commentaire, '
    '[Nf3] est un coup, [Qb3 Qxb3 axb3] des coups à la suite, [w:Re1] un coup blanc plus tard, '
    "et une case s'écrit telle quelle, e5. "
    'Les premiers coups de chaque position sont ceux de la théorie.',
}


def title(name, language):
    return CHAPTERS[name][LANGUAGES.index(language)]


def key_of(board):
    # Pieces and side to move, as the review keys the study's positions (theory/study.ts).
    return ' '.join(board.fen().split()[:2])


def parse(board, san):
    """The move `san` names, written as python-chess writes it: its parser reads Nd5 as Nxd5."""
    try:
        move = board.parse_san(san)
    except ValueError:
        return None
    return move if board.san(move).rstrip('+#') == san.rstrip('+#') else None


def passed(board):
    other = board.copy()
    other.push(chess.Move.null())
    return other


def planned(board, san):
    """The SAN of `san` for the side to move, now or after one more move of its own."""
    move = parse(board, san)
    if move:
        return board.san(move)
    for first in list(board.legal_moves):
        later = board.copy()
        later.push(first)
        later.push(chess.Move.null())
        if not later.is_check() and (move := parse(later, san)):
            return later.san(move)
    return None


def shape_commands(shapes):
    """The shapes as Lichess writes them after a comment: [%csl Rd5][%cal Ge2e4]."""
    squares = [shape for shape in shapes if len(shape) == 3]
    arrows = [shape for shape in shapes if len(shape) == 5]
    return ''.join(
        f'[%{command} {",".join(found)}]'
        for command, found in (('csl', squares), ('cal', arrows))
        if found
    )


class Entry:
    def __init__(self, source):
        self.source = source
        self.board = chess.Board()
        self.moves = []
        for san in source['line'].split():
            move = self.board.parse_san(san)
            self.moves.append(move)
            self.board.push(move)
        self.played = [san.rstrip('+#') for san in self.line_sans()]
        self.unchecked = []
        self.errors = []

    def line_sans(self):
        board, sans = chess.Board(), []
        for move in self.moves:
            sans.append(board.san(move))
            board.push(move)
        return sans

    def sequence(self, sans):
        """Moves one after the other, from the position or with its side to move passing."""
        for start in (self.board, passed(self.board)):
            board, written = start.copy(), []
            for san in sans:
                move = parse(board, san)
                if not move:
                    break
                written.append(board.san(move))
                board.push(move)
            else:
                return f'[{" ".join(written)}]'
        self.errors.append(f'{{{" ".join(sans)}}}')
        return ''

    def chip(self, san, color=None):
        if ' ' in san and color is None:
            return self.sequence(san.split())
        if color is not None:
            self.unchecked.append(f'{color}:{san}')
            return f'[{color}:{san}]'
        if move := parse(self.board, san):
            return f'[{self.board.san(move)}]'
        if san.rstrip('+#') in self.played:
            return f'[{san}]'
        for side in (passed(self.board), self.board):
            if found := planned(side, san):
                return f'[{found}]'
        self.errors.append(f'{{{san}}}')
        return ''

    def shapes(self, shapes):
        """The shapes, checked: a brush, a square or two squares apart."""
        for shape in shapes:
            match = SHAPE.match(shape)
            if not match or match[1] == match[2]:
                self.errors.append(f'shape {shape}')
        return [shape for shape in shapes if SHAPE.match(shape) and shape[1:3] != shape[3:5]]

    def comment(self, language, source=None):
        source = source or self.source
        if language not in source:
            self.errors.append(f'no {language} text')
            return ''
        commands = shape_commands(self.shapes(source.get('shapes', [])))
        return ' '.join(part for part in (self.text(language, source), commands) if part)

    def text(self, language, source=None):
        def token(match):
            color, san, square = match.groups()
            return square or self.chip(san.strip(), color)

        return MARK.sub(token, (source or self.source).get(language, '').strip())

    def next(self):
        return [self.board.parse_san(san) for san in self.source.get('next', [])]

    def mistake_moves(self):
        """The mistakes' moves that can be played, each with its source."""
        found = []
        for mistake in self.source.get('mistakes', []):
            move = parse(self.board, mistake['move'])
            if move:
                found.append((move, mistake))
        return found

    def mistakes(self, language):
        """Each mistake: its move, mark, the moves that punish it and its comment, checked."""
        found = []
        theory = set(self.next())
        for mistake in self.source.get('mistakes', []):
            move = parse(self.board, mistake['move'])
            if not move or move in theory:
                self.errors.append(
                    f'mistake {mistake["move"]}' + (' (a theory move)' if move else '')
                )
                continue
            after = Entry({'line': f'{self.source["line"]} {self.board.san(move)}'})
            comment = after.comment(language, mistake)
            board, punish = after.board.copy(), []
            for san in mistake.get('punish', '').split():
                answer = parse(board, san)
                if not answer:
                    self.errors.append(f'punishment {mistake["move"]} … {san}')
                    break
                punish.append(answer)
                board.push(answer)
            self.errors += after.errors
            self.unchecked += after.unchecked
            found.append(
                {'move': move, 'mark': mistake.get('mark', '?'), 'punish': punish, 'text': comment}
            )
        return found


MARKS = {'?': chess.pgn.NAG_MISTAKE, '??': chess.pgn.NAG_BLUNDER, '?!': chess.pgn.NAG_DUBIOUS_MOVE}


class Node:
    def __init__(self):
        self.children = {}
        self.comment = None
        self.first = []
        self.nags = set()
        self.entry = False


def chapter_tree(entries, language):
    root = Node()
    for entry in entries:
        node = root
        for move in entry.moves:
            node = node.children.setdefault(move, Node())
        if node.nags:
            sys.exit(f'{entry.source["line"]} is a mistake of the same chapter: keep one')
        node.comment, node.entry = entry.comment(language), True
        node.first = entry.next()
        for move in node.first:
            node.children.setdefault(move, Node())
        for mistake in entry.mistakes(language):
            child = node.children.setdefault(mistake['move'], Node())
            if child.entry:
                sys.exit(
                    f'{entry.source["line"]} {mistake["move"]} '
                    'is an entry of the same chapter: keep one'
                )
            child.comment, child.nags = mistake['text'], {MARKS[mistake['mark']]}
            for move in mistake['punish']:
                child = child.children.setdefault(move, Node())
    return root


def write_game(name, root, language):
    game = chess.pgn.Game()
    game.headers.clear()
    game.headers['Event'] = name
    game.comment = INTRO[language]

    def grow(pgn_node, node):
        # Theory's moves first, in its order: a study's main line is a position's first move.
        order = [move for move in node.first if move in node.children]
        order += [move for move in node.children if move not in order]
        for move in order:
            child = node.children[move]
            added = pgn_node.add_variation(move, comment=child.comment or '', nags=child.nags)
            grow(added, child)

    grow(game, root)
    return str(game.accept(chess.pgn.StringExporter(headers=True, variations=True, comments=True)))


def write_chapter(name, entries, language):
    """The chapter's games: one, or its parts when it's too long for Lichess, each checked."""
    root = chapter_tree(entries, language)
    whole = write_game(title(name, language), root, language)
    parts = split(root)
    if len(parts) == 1 and fits(whole):
        return [whole]
    games = [
        write_game(f'{title(name, language)} ({i})', part, language)
        for i, part in enumerate(parts, 1)
    ]
    for i, game in enumerate(games, 1):
        if not fits(game):
            sys.exit(f'{name} ({i}) is still too long for Lichess: lower split.MAX_CHARS')
    if commented(games) != commented([whole]):
        sys.exit(f'{name}: its parts lost positions of the chapter')
    return games


def has_language(sources, language):
    """Whether every entry and mistake of the chapters has a text in `language`."""
    return all(
        language in source and all(language in mistake for mistake in source.get('mistakes', []))
        for chapter in sources
        for source in chapter
    )


def check(entry, languages):
    """Prints what's wrong with the entry; whether nothing that stops the study is."""
    for language in languages:
        entry.comment(language)
        entry.mistakes(language)
    if entry.unchecked:
        print(f'{entry.source["line"]}: unchecked {", ".join(sorted(set(entry.unchecked)))}')
    if entry.errors:
        print(f'{entry.source["line"]}: {", ".join(sorted(set(entry.errors)))}')
    return not entry.errors


def mistaken_keys(entry):
    """The positions the entry's mistakes reach."""
    keys = []
    for move, _ in entry.mistake_moves():
        board = entry.board.copy()
        board.push(move)
        keys.append(key_of(board))
    return keys


def read_chapter(source_list, lines, languages):
    """A chapter's entries, checked: exits on a position twice, or one both theory and a mistake."""
    entries, failed, mistaken = [], False, {}
    for source in source_list:
        entry = Entry(source)
        key = key_of(entry.board)
        if key in lines:
            sys.exit(f'{source["line"]} reaches the position of {lines[key]}: keep one')
        lines[key] = source['line']
        failed = not check(entry, languages) or failed
        for reached in mistaken_keys(entry):
            mistaken[reached] = source['line']
        entries.append(entry)
    for entry in entries:
        key = key_of(entry.board)
        if key in mistaken:
            sys.exit(
                f'{entry.source["line"]} is reached by a mistake after {mistaken[key]}: keep one'
            )
    return entries, failed


def read_sources(folder, asked):
    """Each chapter's entries and the languages to write, checked."""
    extra = {path.stem for path in folder.glob('*.json')} - set(CHAPTERS)
    if extra:
        sys.exit(f'No chapter for {", ".join(sorted(extra))}: name it in CHAPTERS')
    names = [name for name in CHAPTERS if (folder / f'{name}.json').exists()]
    sources = [json.loads((folder / f'{name}.json').read_text(encoding='utf8')) for name in names]
    languages = asked or [language for language in LANGUAGES if has_language(sources, language)]
    if not asked and len(languages) < len(LANGUAGES):
        print(f'Not every text is in {", ".join(set(LANGUAGES) - set(languages))} yet: left out')
    chapters, lines, failed = [], {}, False
    for name, source_list in zip(names, sources, strict=True):
        entries, chapter_failed = read_chapter(source_list, lines, languages)
        failed = failed or chapter_failed
        chapters.append((name, entries))
    if failed:
        sys.exit('Fix the entries above')
    return chapters, languages, len(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Writes the coach's opening theory as a study's PGN."
    )
    parser.add_argument('folder', type=Path)
    parser.add_argument('languages', nargs='*', choices=LANGUAGES, default=[])
    parser.add_argument('--sources', type=Path, default=SOURCES)
    args = parser.parse_args()
    args.folder.mkdir(parents=True, exist_ok=True)
    chapters, languages, count = read_sources(args.sources, args.languages)
    for language in languages:
        games = [
            game for name, entries in chapters for game in write_chapter(name, entries, language)
        ]
        if len(games) > MAX_CHAPTERS:
            sys.exit(f'{language}: {len(games)} chapters, past the {MAX_CHAPTERS} a study holds')
        (args.folder / f'{language}.pgn').write_text('\n\n'.join(games) + '\n', encoding='utf8')
        print(f'{language}: {count} positions in {len(games)} chapters')


if __name__ == '__main__':
    main()
