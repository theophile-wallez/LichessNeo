"""The openings the practice page offers (src/page/review/practice/openings-data.ts),
picked from Lichess's own list, lichess-org/chess-openings (CC0): each line's
name and ECO code as Lichess gives them, and the position it reaches, for the
card's little board. Needs python-chess.

  python3 tools/openings/generate.py <folder of the list's a.tsv to e.tsv>
"""

import csv
import io
import sys
from pathlib import Path

import chess
import chess.pgn

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/page/review/practice/openings-data.ts'

# The lines, by the side that practices them: the one that chose the opening.
LINES = {
    'white': [
        '1. e4 e5 2. Nf3 Nc6 3. Bc4',
        '1. e4 e5 2. Nf3 Nc6 3. Bb5',
        '1. e4 e5 2. Nf3 Nc6 3. d4',
        '1. e4 e5 2. Nc3',
        '1. e4 e5 2. f4',
        '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4',
        '1. e4 e5 2. d4 exd4 3. c3',
        '1. e4 c5 2. c3',
        '1. e4 c5 2. d4 cxd4 3. c3',
        '1. d4 d5 2. c4',
        '1. d4 d5 2. Nf3 Nf6 3. Bf4',
        '1. d4 Nf6 2. c4 e6 3. g3',
        '1. d4 Nf6 2. Bg5',
        '1. c4',
        '1. Nf3 d5 2. c4',
        '1. Nf3 d5 2. g3',
        '1. f4',
    ],
    'black': [
        '1. e4 c5',
        '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
        '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6',
        '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 g6',
        '1. e4 e6',
        '1. e4 c6',
        '1. e4 d5',
        '1. e4 d6',
        '1. e4 Nf6',
        '1. e4 g6',
        '1. e4 e5 2. Nf3 Nf6',
        '1. e4 e5 2. Nf3 d6',
        '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6',
        '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6',
        '1. d4 d5 2. c4 e6',
        '1. d4 d5 2. c4 dxc4',
        '1. d4 d5 2. c4 c6',
        '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6',
        '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4',
        '1. d4 Nf6 2. c4 g6 3. Nc3 d5',
        '1. d4 Nf6 2. c4 e6 3. Nf3 b6',
        '1. d4 Nf6 2. c4 c5 3. d5 b5',
        '1. d4 f5',
    ],
}


def read_list(folder: Path) -> dict[str, tuple[str, str]]:
    """Each line of the list, by its moves: its ECO code and name."""
    names = {}
    for letter in 'abcde':
        with open(folder / f'{letter}.tsv', encoding='utf-8') as file:
            for row in csv.DictReader(file, delimiter='\t'):
                names.setdefault(row['pgn'], (row['eco'], row['name']))
    return names


def entry(side: str, pgn: str, names: dict[str, tuple[str, str]]) -> str:
    if pgn not in names:
        sys.exit(f'Not in the list: {pgn}')
    eco, name = names[pgn]
    board = chess.pgn.read_game(io.StringIO(pgn)).end().board()
    moves = ' '.join(token for token in pgn.split() if not token.endswith('.'))
    return '|'.join([side, eco, name, moves, board.board_fen(), board.peek().uci()])


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    names = read_list(Path(sys.argv[1]))
    lines = [entry(side, pgn, names) for side, pgns in LINES.items() for pgn in pgns]
    OUT.write_text(
        '// Written by tools/openings/generate.py from lichess-org/chess-openings (CC0):\n'
        '// edit the script, not this file.\n\n'
        '// One opening a line: the side that practices it, its ECO code, its name, its\n'
        '// moves, the position they reach (a FEN\'s placement) and the last of them.\n'
        'export const OPENINGS_TABLE = `\n' + '\n'.join(lines) + '\n`;\n',
        encoding='utf-8',
    )
    print(f'{len(lines)} openings written to {OUT.relative_to(ROOT)}')


main()
