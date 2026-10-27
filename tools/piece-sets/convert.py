"""The extension's own piece sets (public/img/pieces), from their full-size
drawings.

Each folder holds one set's twelve PNGs, named as Lichess names its pieces
(wK.png … bP.png); the folder's name, in lower case, is the set's id. Each is
scaled to SIZE, its faint alpha specks off the piece cleared, and saved as a
WebP. Needs Pillow.

  python3 tools/piece-sets/convert.py <set folder>…
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/img/pieces'
# A square of a large board on a 2x screen.
SIZE = 384
# The drawings carry stray pixels of near-zero alpha around the piece.
SPECK_ALPHA = 8
NAMES = [color + role for color in 'wb' for role in 'KQRBNP']


def convert(source: Path, target: Path) -> None:
    image = Image.open(source).convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS)
    alpha = image.getchannel('A').point(lambda value: 0 if value < SPECK_ALPHA else value)
    image.putalpha(alpha)
    image.save(target, 'WEBP', quality=90, alpha_quality=100, method=6)


def main(folders: list[str]) -> None:
    for folder in map(Path, folders):
        target = OUT / folder.name.lower()
        target.mkdir(parents=True, exist_ok=True)
        for name in NAMES:
            convert(folder / f'{name}.png', target / f'{name}.webp')
        size = sum(file.stat().st_size for file in target.iterdir())
        print(f'{target.name}: {size // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1:])
