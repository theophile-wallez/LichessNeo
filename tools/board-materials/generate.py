"""The board textures (public/img/boards): one relief per material, which
styles/board/pieces.css lays over a board's two colors in `hard-light`.

Each material is drawn in color from seeded noise, then turned into its
relief: every channel of every pixel around its shade's own mean, mid-grey
where it equals it, so the relief over the material's mean colors gives the
drawing back whole. Channel by channel rather than on lightness alone, so a
square may be its own color and not just its own shade of the one next to it,
as every square of a wooden board is. Lengths are in design pixels, a square
being 80 of them, whatever size the board is drawn at. Prints each material's
mean colors, which its ready-made board (content/packs/materials.ts) takes.
Needs NumPy, SciPy and Pillow.

  python3 tools/board-materials/generate.py [material …]
"""

import sys
import zlib
from pathlib import Path

import numpy as np
from PIL import Image

from drawing import BOARD, checker, mean_color, relief, spreads
from materials import MATERIALS

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/img/boards'
QUALITY = 92


def main(names):
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (draw, gain) in MATERIALS.items():
        if names and name not in names:
            continue
        rng = np.random.default_rng(zlib.crc32(name.encode()))
        image = np.clip(draw(rng), 0, 255)
        dark = checker()
        level = relief(image)
        if gain != 1:
            level = np.clip(128 + (level.astype(float) - 128) * gain, 0, 255).astype(np.uint8)
        Image.fromarray(level, 'RGB').save(OUT / f'{name}.webp', quality=QUALITY)
        print(
            f'{name}: light {mean_color(image, ~dark)} spread {spreads(image, False)}, '
            f'dark {mean_color(image, dark)} spread {spreads(image, True)}'
        )
    print(f'{BOARD}px boards in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main(sys.argv[1:])
